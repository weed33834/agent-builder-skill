"""心镜 MindMirror —— 前端用户全流程点击测试

以普通用户视角完整走通三镜 × 三版本:
1. 首页加载 → 检查三镜卡片渲染
2. 进入测评 → 检查题目加载
3. 逐题作答(点击/拖拽/滑块/矩阵/IAT 全题型)
4. 提交 → 检查结果页渲染
5. 收集所有 console 错误 / 网络失败 / 渲染异常

用法:
  uv run python scripts/e2e_walkthrough.py             # 三镜 × 三版本全跑
  uv run python scripts/e2e_walkthrough.py fast         # 仅 fast 版
  uv run python scripts/e2e_walkthrough.py deep celebrity  # 仅 celebrity 的 deep 版
"""
import contextlib
import json
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import TimeoutError as PWTimeout
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"

issues = []  # 收集所有问题

# 题库缓存:{(mirror, version): {qid: question_dict}}
# 用于 IAT 题型确定每个词的正确分类,避免盲目点击导致卡住
_BANK_CACHE: dict[tuple[str, str], dict[str, dict]] = {}

# 当前 IAT 题所在的(mirror, version),用于从 _BANK_CACHE 取题库
# walk_one_mirror 进入时设置,answer_question 中 IAT 分支引用
_IAT_CURRENT_KEY: tuple[str, str] | None = None


def fetch_bank(mirror: str, version: str) -> dict[str, dict]:
    """通过 API 拉取题库,构建 {qid: question_dict} 映射。"""
    key = (mirror, version)
    if key in _BANK_CACHE:
        return _BANK_CACHE[key]
    url = f"{BASE}/api/assessments/{mirror}/questions?version={version}"
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.loads(r.read())
    mapping = {q["id"]: q for q in data.get("questions", [])}
    _BANK_CACHE[key] = mapping
    return mapping


def log(stage, msg, level="info"):
    prefix = {"info": "  ", "warn": "⚠ ", "error": "✗ ", "ok": "✓ "}
    print(f"{prefix.get(level, '  ')}[{stage}] {msg}")
    if level in ("warn", "error"):
        issues.append(f"[{stage}] {level.upper()}: {msg}")


def answer_question(page, qtype, qid=None):
    """按题型作答一题。返回是否成功。"""
    try:
        if qtype in ("scale", "dilemma"):
            # 点击第一个选项
            sel = ".scale-point" if qtype == "scale" else ".option"
            page.wait_for_selector(sel, timeout=5000)
            page.click(f"{sel}:first-child")
            return True
        if qtype == "forced_choice":
            page.wait_for_selector(".fc-card", timeout=5000)
            page.click(".fc-card:first-child")
            # forced_choice 没有 confirm 按钮,点击即提交
            return True
        if qtype == "slider":
            page.wait_for_selector("#slider-input", timeout=5000)
            # 设值并确认
            page.evaluate("""() => {
                const s = document.getElementById('slider-input');
                s.value = 70;
                s.dispatchEvent(new Event('input', {bubbles:true}));
                s.dispatchEvent(new Event('change', {bubbles:true}));
            }""")
            page.click("#slider-confirm")
            return True
        if qtype == "allocation":
            page.wait_for_selector(".alloc-row", timeout=5000)
            # 给每个目标分配值,总和=100。简单:前几个 25,最后一个用 auto-balance
            rows = page.query_selector_all(".alloc-row")
            n = len(rows)
            each = 100 // n
            for _, r in enumerate(rows):
                input_el = r.query_selector("input[type=range]")
                page.evaluate("""(args) => {
                    const [input, val] = args;
                    input.value = val;
                    input.dispatchEvent(new Event('input', {bubbles:true}));
                    input.dispatchEvent(new Event('change', {bubbles:true}));
                }""", [input_el, each])
            # 等过渡动画结束(alloc-bar-fill 有 0.25s transition)
            page.wait_for_timeout(400)
            # auto-balance 按钮:.alloc-total 在 ok 状态下可能被识别为遮挡。
            # 用 force=True 跳过遮挡检测,直接对 DOM 元素派发点击事件。
            page.click("#alloc-balance", force=True)
            page.wait_for_timeout(200)
            page.click("#alloc-confirm", force=True)
            return True
        if qtype == "auction":
            page.wait_for_selector(".auction-row", timeout=5000)
            # 给前两项各投 30,保留 40
            rows = page.query_selector_all(".auction-row")
            for i in range(min(2, len(rows))):
                # 点 +10 三次
                for _ in range(3):
                    rows[i].query_selector('[data-delta="10"]').click()
            page.click("#auction-confirm")
            return True
        if qtype == "sort":
            page.wait_for_selector(".sort-item", timeout=5000)
            # 直接确认(用默认洗牌顺序)
            page.click("#sort-confirm")
            return True
        if qtype == "matrix":
            page.wait_for_selector(".matrix-row", timeout=5000)
            # 每行选第 5 个点(中间偏同意)
            rows = page.query_selector_all(".matrix-row")
            for r in rows:
                dots = r.query_selector_all(".matrix-dot")
                if len(dots) >= 5:
                    dots[4].click()
            page.click("#matrix-confirm")
            return True
        if qtype == "iat":
            page.wait_for_selector("#iat-word", timeout=5000)
            # IAT 流程:每个词显示后,点 left/right 分类。
            # - 错答:词不消失,闪烁纠错,需点另一侧
            # - 正答:词推进,显示注视点 "+" 350ms,再显示下一词
            # 不能在 "+" 时退出,要等到进度达 N/N 或离开 IAT 题。
            # 优先用题库数据(qid 提供)直接点正确一侧,避免盲目点击卡住
            words_by_text = {}
            if qid:
                bank_map = _BANK_CACHE.get(_IAT_CURRENT_KEY)
                if bank_map and qid in bank_map:
                    for w in bank_map[qid].get("words", []):
                        # 同词可能出现多次(不同类别),用首次出现的类别
                        words_by_text.setdefault(w["word"], w["category"])

            last_word = None
            same_count = 0
            # 当前 IAT 题的 qid,用于检测连续 IAT 题切换(避免一份词映射被用于多题)
            initial_qid = qid
            for _ in range(500):  # 安全上限
                # 离开 IAT 题或跳转 → 完成
                if "/report.html" in page.url:
                    return True
                iat_area = page.query_selector(".iat-area")
                if not iat_area:
                    return True
                # 检测 qid 变化:连续 IAT 题切换时,新 .iat-area 的 data-q 不同。
                # 此时退出,让主循环重新调用 answer_question 重建词映射。
                if initial_qid:
                    cur_qid = iat_area.get_attribute("data-q")
                    if cur_qid and cur_qid != initial_qid:
                        return True
                # 读取当前词
                word_el = page.query_selector("#iat-word")
                if not word_el:
                    time.sleep(0.1)
                    continue
                word_text = word_el.inner_text().strip()
                # 注视点 "+" 或空 → 等待(showFixation 后 350ms 才出新词)
                if not word_text or word_text == "+":
                    time.sleep(0.06)
                    continue
                # 决定点击哪一侧
                cat = words_by_text.get(word_text)
                if cat == "left":
                    sides = ["#iat-left", "#iat-right"]
                elif cat == "right":
                    sides = ["#iat-right", "#iat-left"]
                else:
                    # 未知词,先左后右
                    sides = ["#iat-left", "#iat-right"]
                # 同一词卡住过久 → 强制切另一侧(理论上题库齐全时不会触发)
                if word_text == last_word:
                    same_count += 1
                    if same_count > 3:
                        # 反转顺序
                        sides = sides[::-1]
                        same_count = 0
                else:
                    same_count = 0
                    last_word = word_text
                # 点击首选侧
                with contextlib.suppress(Exception):
                    page.click(sides[0], timeout=800, force=True)
                time.sleep(0.06)
                # 词若未变 → 首选错,点另一侧
                # (recordAnswer 触发后 #iat-word 会消失或被替换,自然结束循环)
                new_el = page.query_selector("#iat-word")
                new_text = new_el.inner_text().strip() if new_el else ""
                if new_text == word_text:
                    with contextlib.suppress(Exception):
                        page.click(sides[1], timeout=800, force=True)
                    time.sleep(0.06)
            return True
    except PWTimeout as e:
        log(qtype, f"题型 {qtype} 等待元素超时: {e}", "error")
        return False
    except Exception as e:
        log(qtype, f"题型 {qtype} 作答异常: {type(e).__name__}: {e}", "error")
        return False
    return False


def get_current_qid(page):
    """读取当前题的 data-q 属性(无题目或过渡卡时返回 None)。"""
    return page.evaluate("""() => {
        const card = document.querySelector('.question-card');
        if (!card) return null;
        const el = card.querySelector('[data-q]');
        return el ? el.getAttribute('data-q') : null;
    }""")


def get_current_qtype(page):
    """从 DOM 推断当前题型。"""
    return page.evaluate("""() => {
        const card = document.querySelector('.question-card');
        if (!card) return null;
        if (card.querySelector('.scale-points')) return 'scale';
        if (card.querySelector('.options')) return 'dilemma';
        if (card.querySelector('.fc-cards')) return 'forced_choice';
        if (card.querySelector('#slider-input')) return 'slider';
        if (card.querySelector('.alloc-list')) return 'allocation';
        if (card.querySelector('.auction-area')) return 'auction';
        if (card.querySelector('.sort-list')) return 'sort';
        if (card.querySelector('.matrix-area')) return 'matrix';
        if (card.querySelector('.iat-area')) return 'iat';
        return 'unknown';
    }""")


def wait_for_state_change(page, prev_qid, timeout_ms=10000):
    """轮询等待状态变化:跳转 report / 出现 section-start / 新题渲染。

    返回 'report' | 'section' | 'question' | None(超时)。
    页面跳转期间 query_selector 可能抛 "Execution context was destroyed",
    视为已 navigation,返回 'report' 让上层复检 URL。
    """
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        try:
            if "/report.html" in page.url:
                return "report"
            if page.query_selector(".section-start"):
                return "section"
            cur_qid = get_current_qid(page)
            if cur_qid and cur_qid != prev_qid:
                return "question"
        except Exception:
            # 多半是页面正在跳转,复检 URL
            try:
                if "/report.html" in page.url:
                    return "report"
            except Exception:
                pass
            time.sleep(0.1)
            continue
        time.sleep(0.08)
    return None


def walk_one_mirror(page, mirror_type, version="fast"):
    """走通一个镜子全流程。"""
    global _IAT_CURRENT_KEY
    stage = f"walk/{mirror_type}/{version}"
    log(stage, f"开始测试 {mirror_type} ({version})")

    # 预加载题库:用于 IAT 题型确定每个词的正确分类,
    # 避免盲点击导致卡住(错答不推进,持续闪烁)。
    _IAT_CURRENT_KEY = (mirror_type, version)
    try:
        fetch_bank(mirror_type, version)
    except Exception as e:
        log(stage, f"题库预加载失败(IAT 将退化盲点): {e}", "warn")

    # 进入答题页
    url = f"{BASE}/take.html?type={mirror_type}&version={version}"
    page.goto(url, wait_until="domcontentloaded")
    # 等首屏渲染完成:section-intro 或 question-card
    try:
        page.wait_for_selector(".section-start, .question-card", timeout=10000)
    except PWTimeout:
        log(stage, f"首屏未渲染,URL={page.url}", "error")
        return False

    # 检查是否有草稿恢复弹窗(首次应无)
    draft_overlay = page.query_selector(".draft-resume")
    if draft_overlay:
        log(stage, "检测到草稿恢复弹窗,点击重开", "warn")
        page.click("#draft-restart")
        page.wait_for_selector(".section-start, .question-card", timeout=10000)

    answered = 0
    max_questions = 100  # 安全上限
    while answered < max_questions:
        # 已跳转结果页(放在最前,任何导航后立即结束循环)
        try:
            cur_url = page.url
        except Exception:
            cur_url = ""
        if "/report.html" in cur_url:
            log(stage, f"已完成 {answered} 题,跳转结果页", "ok")
            break

        # 处理 section-intro 过渡卡
        try:
            section_start = page.query_selector(".section-start")
        except Exception:
            # 页面正在跳转,等一下复检
            page.wait_for_timeout(200)
            continue
        if section_start:
            try:
                section_start.click()
                page.wait_for_selector(".question-card", timeout=5000)
            except PWTimeout:
                log(stage, "section-start 点击后未渲染题目", "error")
                break
            except Exception:
                # 跳转中,等一下复检 URL
                page.wait_for_timeout(200)
                continue
            # 等题型容器就位
            page.wait_for_timeout(150)
            continue

        # 读取当前题型与 qid
        try:
            qtype = get_current_qtype(page)
        except Exception:
            page.wait_for_timeout(200)
            continue
        if qtype is None:
            # 可能是 loading 或已结束
            try:
                loading = page.query_selector(".loading-overlay")
            except Exception:
                loading = None
            if loading:
                page.wait_for_timeout(1000)
                continue
            log(stage, f"无法识别当前状态,URL={page.url}, body={page.inner_text('body')[:200]}", "error")
            break
        if qtype == "unknown":
            log(stage, "未知题型,跳过", "warn")
            break

        try:
            prev_qid = get_current_qid(page)
            progress_text = page.query_selector("#progress-text")
            prog = progress_text.inner_text() if progress_text else "?"
        except Exception:
            page.wait_for_timeout(200)
            continue

        ok = answer_question(page, qtype, qid=prev_qid)
        if not ok:
            log(stage, f"第 {answered+1} 题({qtype})作答失败,进度 {prog}", "error")
            break
        answered += 1

        # 等状态变化:report / section / 新题
        nxt = wait_for_state_change(page, prev_qid, timeout_ms=10000)
        if nxt is None:
            log(stage, f"作答后 10s 无状态变化,进度 {prog}", "error")
            break

    if "/report.html" not in page.url:
        log(stage, f"未跳转到结果页,当前 URL={page.url}", "error")
        return False

    # 检查结果页
    log(stage, "进入结果页,检查渲染")
    try:
        page.wait_for_selector(".report-container, .report, #report, main", timeout=15000)
        log(stage, "结果页容器已渲染", "ok")
    except PWTimeout:
        body = page.inner_text("body")
        if len(body) > 100:
            log(stage, f"结果页未找到标准容器,但页面有内容(len={len(body)})", "warn")
        else:
            log(stage, f"结果页可能空白,body={body[:200]}", "error")

    # 检查关键结果元素
    body_text = page.inner_text("body")
    if "雷达" in body_text or "radar" in body_text.lower() or "维度" in body_text:
        log(stage, "结果页含维度/雷达图", "ok")
    if "匹配" in body_text or "名人" in body_text or "意识形态" in body_text or "价值" in body_text:
        log(stage, "结果页含匹配结果", "ok")
    if "冲突" in body_text or "张力" in body_text:
        log(stage, "结果页含冲突分析", "ok")

    return True


def main():
    print("=" * 60)
    print("心镜 MindMirror —— 前端用户全流程点击测试")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
        )
        page = context.new_page()

        # 收集 console 错误和网络失败
        console_errors = []
        network_fails = []

        # 预期失败:匿名访问受保护接口、404 测试路径
        EXPECTED_FAIL_PATTERNS = (
            "/api/goals/me",        # 训练营匿名访问,401/404 均预期
            "/api/missions/today",  # 同上
            "/api/missions/streak", # 同上
            "/nonexistent-xxx",     # 阶段3 故意 404
        )

        def is_expected_fail(url):
            return any(p in url for p in EXPECTED_FAIL_PATTERNS)

        def on_console(msg):
            if msg.type == "error":
                txt = msg.text or ""
                # "Failed to load resource" 已在 on_response 按 URL 跟踪(并过滤预期失败)。
                # 该 console 消息无 URL 信息,直接跳过避免重复记录。
                if "Failed to load resource" in txt:
                    return
                console_errors.append(txt)

        def on_response(resp):
            if resp.status >= 400 and not is_expected_fail(resp.url):
                network_fails.append(f"{resp.status} {resp.url}")

        page.on("console", on_console)
        page.on("response", on_response)

        # ===== 阶段 1:首页 =====
        print("\n[阶段1] 首页加载")
        page.goto(f"{BASE}/", wait_until="domcontentloaded")
        try:
            page.wait_for_selector("#mirrors .mirror-card", timeout=10000)
            cards = page.query_selector_all(".mirror-card")
            log("home", f"首页三镜卡片渲染: {len(cards)} 张", "ok" if len(cards) == 3 else "warn")
            for c in cards:
                t = c.get_attribute("data-type")
                log("home", f"  - {t}: {c.inner_text()[:60].strip()}")
        except PWTimeout:
            log("home", "首页三镜卡片未渲染", "error")

        h1 = page.inner_text("h1")
        log("home", f"标题: {h1}", "ok" if "心镜" in h1 else "warn")

        # 检查 SEO meta
        title = page.title()
        desc = page.evaluate("document.querySelector('meta[name=description]')?.content || ''")
        og_title = page.evaluate("document.querySelector('meta[property=\"og:title\"]')?.content || ''")
        log("home", f"SEO title={title[:40]}", "ok" if title else "warn")
        log("home", f"SEO desc={desc[:40]}...", "ok" if desc else "warn")
        log("home", f"OG title={og_title[:40]}", "ok" if og_title else "warn")

        # ===== 阶段 2:三镜 × 三版本 全流程 =====
        # 默认全跑;可通过命令行参数限定版本/镜子
        # 例如:uv run python scripts/e2e_walkthrough.py fast
        #      uv run python scripts/e2e_walkthrough.py standard celebrity
        versions = ["fast", "standard", "deep"]
        mirrors = ["celebrity", "value", "ideology"]
        args = sys.argv[1:]
        if args:
            arg_v = [a for a in args if a in versions]
            arg_m = [a for a in args if a in mirrors]
            if arg_v:
                versions = arg_v
            if arg_m:
                mirrors = arg_m

        for version in versions:
            for mirror in mirrors:
                print(f"\n[阶段2] {mirror} {version} 版全流程")
                # 每次用新 context(清 localStorage,避免草稿干扰)
                new_context = browser.new_context(
                    viewport={"width": 1280, "height": 900},
                    locale="zh-CN",
                )
                new_page = new_context.new_page()
                new_page.on("console", on_console)
                new_page.on("response", on_response)
                try:
                    walk_one_mirror(new_page, mirror, version)
                except Exception as e:
                    log(f"walk/{mirror}/{version}", f"流程异常: {type(e).__name__}: {e}", "error")
                # 截图结果页
                try:
                    out = Path(f"/tmp/e2e_{mirror}_{version}_result.png")
                    new_page.screenshot(path=str(out), full_page=True)
                    log(f"walk/{mirror}/{version}", f"结果页截图: {out}", "ok")
                except Exception:
                    pass
                new_context.close()

        # ===== 阶段 3:其他页面可访问性 =====
        print("\n[阶段3] 其他页面可访问性")
        for path, name in [("/about.html", "关于"), ("/history.html", "历史报告"),
                           ("/login.html", "登录"), ("/compare.html", "对比"),
                           ("/bootcamp.html", "训练营"), ("/nonexistent-xxx", "404")]:
            try:
                resp = page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
                status = resp.status if resp else 0
                if path == "/nonexistent-xxx":
                    log("access", f"{name}: HTTP {status}", "ok" if status == 404 else "warn")
                else:
                    log("access", f"{name}: HTTP {status}", "ok" if status == 200 else "warn")
            except Exception as e:
                log("access", f"{name} 访问异常: {e}", "error")

        # ===== 汇总 =====
        print("\n" + "=" * 60)
        print("[汇总] 控制台错误 / 网络失败")
        print("=" * 60)
        if console_errors:
            print(f"\n控制台错误 ({len(console_errors)} 条):")
            for e in console_errors[:20]:
                print(f"  - {e[:200]}")
            issues.extend([f"console: {e}" for e in console_errors[:20]])
        else:
            print("控制台错误: 无")

        if network_fails:
            print(f"\n网络失败 ({len(network_fails)} 条):")
            for f in network_fails[:20]:
                print(f"  - {f}")
            issues.extend([f"network: {f}" for f in network_fails[:20]])
        else:
            print("网络失败: 无")

        browser.close()

    print("\n" + "=" * 60)
    if issues:
        print(f"[结论] 发现 {len(issues)} 个问题:")
        for i, iss in enumerate(issues, 1):
            print(f"  {i}. {iss}")
        sys.exit(1)
    else:
        print("[结论] 全流程通过,无问题")
        sys.exit(0)


if __name__ == "__main__":
    main()
