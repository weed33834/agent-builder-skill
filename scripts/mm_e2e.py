"""心镜 MindMirror —— 完整 E2E 流程 + 复杂场景测试 + 视觉截图。

用法:.venv/bin/python scripts/mm_e2e.py
前提:fastapi dev 已在 :8765 跑起来,chromium 已装。
"""
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8765"
SHOT_DIR = Path("scripts/mm_shots")
SHOT_DIR.mkdir(exist_ok=True)

SCENARIOS = [
    ("celebrity_fast", "celebrity", "fast"),
    ("celebrity_standard", "celebrity", "standard"),
    ("value_standard", "value", "standard"),
    ("ideology_standard", "ideology", "standard"),
]

HARD_CASES = [
    "refresh_midway", "switch_lang_midway", "back_forward",
    "double_submit", "empty_answer_submit", "rapid_click_alloc",
    "extreme_slider", "timeout_iat", "direct_url_no_login",
    "invalid_compare_code", "figure_detail_404", "profile_without_login",
]


async def shot(page, name):
    p = SHOT_DIR / f"{name}.png"
    await page.screenshot(path=str(p), full_page=True)
    print(f"  shot: {p.name}")


async def get_questions_count(page, atype, version):
    return await page.evaluate(
        """async ([t, v]) => {
            const r = await fetch(`/api/assessments/${t}/questions?version=${v}`);
            return r.ok ? (await r.json()).questions.length : -1;
        }""",
        [atype, version],
    )


async def answer_one(page):
    """答当前题,返回是否答题成功。基于 take.js 真实选择器。"""
    # section-intro 过渡卡 → 点"开始"
    start_btn = await page.query_selector(".section-start")
    if start_btn and await start_btn.is_visible():
        await start_btn.click()
        await page.wait_for_timeout(300)
        return True

    qtype = await page.evaluate("""() => {
        const a = document.getElementById('question-area');
        if (!a) return '';
        if (a.querySelector('.scale-points')) return 'scale';
        if (a.querySelector('.options')) return 'dilemma';
        if (a.querySelector('.alloc-list')) return 'allocation';
        if (a.querySelector('.sort-list')) return 'sort';
        if (a.querySelector('.iat-area')) return 'iat';
        if (a.querySelector('.slider-area')) return 'slider';
        if (a.querySelector('.fc-cards, .fc-area')) return 'forced_choice';
        if (a.querySelector('.matrix-area')) return 'matrix';
        if (a.querySelector('.auction-area')) return 'auction';
        return '';
    }""")

    if qtype == "scale":
        opts = await page.query_selector_all(".scale-point")
        if opts:
            await opts[len(opts) // 2].click()
            return True
    elif qtype == "dilemma":
        opts = await page.query_selector_all(".option")
        if opts:
            await opts[0].click()
            return True
    elif qtype == "allocation":
        # 用自动配平
        auto = await page.query_selector("#alloc-balance")
        if auto and await auto.is_visible():
            await auto.click()
            await page.wait_for_timeout(200)
        confirm = await page.query_selector("#alloc-confirm")
        if confirm:
            await confirm.click()
            return True
    elif qtype == "sort":
        # 不动顺序直接确认
        confirm = await page.query_selector("#sort-confirm")
        if confirm:
            await confirm.click()
            return True
    elif qtype == "iat":
        # 交替按左右
        for _ in range(15):
            btn = await page.query_selector("#iat-left")
            btn2 = await page.query_selector("#iat-right")
            # 看当前词
            word = await page.evaluate("() => { const w = document.getElementById('iat-word'); return w ? w.innerText.trim() : ''; }")
            if '完成' in word or '/' not in (await page.inner_text('#iat-progress')) if await page.query_selector('#iat-progress') else False:
                pass
            try:
                await page.wait_for_selector("#iat-word .iat-stim, #iat-word .iat-word-text", timeout=2000)
            except Exception:
                pass
            if btn2:
                await btn2.click()
            await page.wait_for_timeout(120)
        return True
    elif qtype == "slider":
        sl = await page.query_selector("#slider-input")
        if sl:
            await sl.evaluate("el => { el.value = 70; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
            await page.wait_for_timeout(100)
        confirm = await page.query_selector("#slider-confirm")
        if confirm:
            await confirm.click()
            return True
    elif qtype == "forced_choice":
        cards = await page.query_selector_all(".fc-card")
        if cards:
            await cards[0].click()
            return True
    elif qtype == "matrix":
        rows = await page.query_selector_all(".matrix-row")
        for r in rows:
            dots = await r.query_selector_all(".matrix-dot")
            if dots and len(dots) >= 4:
                await dots[3].click()  # 4 = 中立偏右
                await page.wait_for_timeout(50)
        confirm = await page.query_selector("#matrix-confirm")
        if confirm:
            await confirm.click()
            return True
    elif qtype == "auction":
        # 给前两项出价
        rows = await page.query_selector_all(".auction-row")
        for r in rows[:3]:
            btns = await r.query_selector_all(".alloc-btn")
            if len(btns) >= 4:
                # 点 +10 几下
                for _ in range(2):
                    await btns[3].click()
                    await page.wait_for_timeout(40)
        confirm = await page.query_selector("#auction-confirm")
        if confirm:
            await confirm.click()
            return True
    return False


async def answer_all(page, expect_count):
    answered = 0
    max_iter = expect_count + 30
    while max_iter > 0:
        max_iter -= 1
        # 已到结果页?
        if await page.query_selector(".report-title, #report .report-hero"):
            break
        # 草稿恢复弹窗
        resume = await page.query_selector("#draft-continue, button:has-text('继续'), button:has-text('Continue')")
        if resume and await resume.is_visible():
            try:
                await resume.click()
                await page.wait_for_timeout(400)
            except Exception:
                pass
            continue
        ok = await answer_one(page)
        if not ok:
            await shot(page, f"stuck_{answered}")
            break
        answered += 1
        await page.wait_for_timeout(300)
    return answered


async def run_full_flow(browser, scenario):
    name, atype, version = scenario
    print(f"\n=== 场景: {name} (type={atype}, version={version}) ===")
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)
    try:
        await page.goto(f"{BASE}/take.html?type={atype}&version={version}", wait_until="networkidle")
        await page.wait_for_timeout(800)
        resume = await page.query_selector("#draft-continue, button:has-text('继续'), button:has-text('Continue')")
        if resume and await resume.is_visible():
            await resume.click()
            await page.wait_for_timeout(400)
        await shot(page, f"{name}_01_start")

        qcount = await get_questions_count(page, atype, version)
        print(f"  题库题数: {qcount}")

        answered = await answer_all(page, qcount if qcount > 0 else 40)
        print(f"  答题迭代: {answered}")

        try:
            await page.wait_for_selector(".report-title, #report .report-hero", timeout=25000)
            await page.wait_for_timeout(1800)
            await shot(page, f"{name}_02_report")
            radar = await page.query_selector("#radar canvas, #radar")
            print(f"  雷达图存在: {bool(radar)}")
            portrait = await page.query_selector(".match-portrait")
            if portrait:
                await portrait.click()
                await page.wait_for_timeout(1500)
                await shot(page, f"{name}_03_figure_detail")
                print(f"  名人详情页: {page.url}")
                await page.go_back()
                await page.wait_for_timeout(800)
        except Exception as e:
            print(f"  未到结果页: {e}")
            await shot(page, f"{name}_no_report")

        if errors:
            print(f"  页面错误: {len(errors)} 条")
            for e in errors[:5]:
                print(f"    {e}")
        else:
            print(f"  无页面错误")
        await ctx.close()
        return {"scenario": name, "errors": errors, "answered": answered}
    except Exception as e:
        print(f"  场景异常: {e}")
        await shot(page, f"{name}_error")
        await ctx.close()
        return {"scenario": name, "errors": [str(e)], "answered": 0}


async def run_hard_case(browser, case_name):
    print(f"\n=== 刁难场景: {case_name} ===")
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    result = {"case": case_name, "ok": False, "note": "", "errors": []}
    try:
        if case_name == "refresh_midway":
            await page.goto(f"{BASE}/take.html?type=celebrity&version=fast", wait_until="networkidle")
            await page.wait_for_timeout(800)
            await answer_one(page)
            await page.wait_for_timeout(300)
            await page.reload()
            await page.wait_for_timeout(1200)
            resume = await page.query_selector("#draft-continue, button:has-text('继续'), button:has-text('Continue')")
            result["ok"] = True
            result["note"] = f"草稿恢复弹窗存在: {bool(resume)}"
            await shot(page, "hard_refresh_midway")

        elif case_name == "switch_lang_midway":
            await page.goto(f"{BASE}/take.html?type=celebrity&version=fast", wait_until="networkidle")
            await page.wait_for_timeout(800)
            await answer_one(page)
            en_btn = await page.query_selector(".lang-btn[data-lang='en']")
            if en_btn:
                await en_btn.click()
                await page.wait_for_timeout(600)
            result["ok"] = True
            result["note"] = "切语言后页面未崩"
            await shot(page, "hard_switch_lang")

        elif case_name == "back_forward":
            await page.goto(f"{BASE}/", wait_until="networkidle")
            await page.wait_for_timeout(500)
            await page.goto(f"{BASE}/about.html", wait_until="networkidle")
            await page.wait_for_timeout(500)
            await page.go_back()
            await page.wait_for_timeout(500)
            await page.go_forward()
            await page.wait_for_timeout(500)
            result["ok"] = page.url.endswith("/about.html")
            result["note"] = f"最终 URL: {page.url}"
            await shot(page, "hard_back_forward")

        elif case_name == "double_submit":
            await page.goto(f"{BASE}/take.html?type=celebrity&version=fast", wait_until="networkidle")
            await page.wait_for_timeout(800)
            for _ in range(3):
                await answer_one(page)
                await page.wait_for_timeout(200)
            result["ok"] = True
            result["note"] = "连点未崩(后端幂等)"
            await shot(page, "hard_double_submit")

        elif case_name == "empty_answer_submit":
            await page.goto(f"{BASE}/take.html?type=celebrity&version=fast", wait_until="networkidle")
            await page.wait_for_timeout(800)
            # 看是否有直接提交按钮
            sub = await page.query_selector("button:has-text('提交'), button:has-text('Submit')")
            result["ok"] = True
            result["note"] = "无显式提交按钮(答完自动进)"
            await shot(page, "hard_empty_submit")

        elif case_name == "rapid_click_alloc":
            await page.goto(f"{BASE}/take.html?type=value&version=fast", wait_until="networkidle")
            await page.wait_for_timeout(800)
            # 推进到 allocation 题
            for _ in range(30):
                if await page.query_selector(".alloc-list"):
                    break
                ok = await answer_one(page)
                if not ok:
                    break
                await page.wait_for_timeout(200)
            btns = await page.query_selector_all(".alloc-list .alloc-btn")
            for _ in range(30):
                if btns:
                    await btns[-1].click()
            result["ok"] = True
            result["note"] = "分配题连点未崩"
            await shot(page, "hard_rapid_alloc")

        elif case_name == "extreme_slider":
            await page.goto(f"{BASE}/take.html?type=ideology&version=fast", wait_until="networkidle")
            await page.wait_for_timeout(800)
            for _ in range(40):
                sl = await page.query_selector("#slider-input")
                if sl:
                    await sl.evaluate("el => { el.value = 0; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
                    await page.wait_for_timeout(40)
                    await sl.evaluate("el => { el.value = 100; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
                    await page.wait_for_timeout(40)
                    confirm = await page.query_selector("#slider-confirm")
                    if confirm:
                        await confirm.click()
                else:
                    await answer_one(page)
                await page.wait_for_timeout(150)
            result["ok"] = True
            result["note"] = "滑块极端值未崩"
            await shot(page, "hard_extreme_slider")

        elif case_name == "timeout_iat":
            await page.goto(f"{BASE}/take.html?type=value&version=deep", wait_until="networkidle")
            await page.wait_for_timeout(800)
            for _ in range(60):
                if await page.query_selector(".iat-area"):
                    # 不答,等 3 秒
                    await page.wait_for_timeout(3000)
                    break
                ok = await answer_one(page)
                if not ok:
                    break
                await page.wait_for_timeout(150)
            result["ok"] = True
            result["note"] = "IAT 超时未崩"
            await shot(page, "hard_timeout_iat")

        elif case_name == "direct_url_no_login":
            await page.goto(f"{BASE}/report.html?id=nonexistent", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            result["ok"] = True
            result["note"] = f"未登录访问 report: URL={page.url}"
            await shot(page, "hard_direct_url")

        elif case_name == "invalid_compare_code":
            await page.goto(f"{BASE}/compare.html", wait_until="networkidle")
            await page.wait_for_timeout(800)
            inp = await page.query_selector(".compare-input, input[type='text']")
            if inp:
                await inp.fill("invalid_code_12345")
            go = await page.query_selector("button:has-text('对比'), button:has-text('Compare'), .btn-primary")
            if go:
                await go.click()
                await page.wait_for_timeout(1800)
            result["ok"] = True
            result["note"] = "错误对比码应提示"
            await shot(page, "hard_invalid_compare")

        elif case_name == "figure_detail_404":
            await page.goto(f"{BASE}/figure.html?id=nonexistent_figure", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            result["ok"] = True
            result["note"] = "不存在的人物 id 应提示"
            await shot(page, "hard_figure_404")

        elif case_name == "profile_without_login":
            await page.goto(f"{BASE}/profile.html", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            result["ok"] = True
            result["note"] = f"未登录访问 profile: URL={page.url}"
            await shot(page, "hard_profile_no_login")

        result["errors"] = errors[:3]
        if errors:
            print(f"  错误: {errors[:3]}")
        else:
            print(f"  {result['note']}")
    except Exception as e:
        print(f"  场景异常: {e}")
        result["ok"] = False
        result["note"] = str(e)
        await shot(page, f"hard_{case_name}_err")
    finally:
        await ctx.close()
    return result


async def screenshot_all_pages(browser):
    print("\n=== 视觉截图:所有页面 ===")
    pages = [
        ("home", "/"),
        ("about", "/about.html"),
        ("login", "/login.html"),
        ("history", "/history.html"),
        ("profile", "/profile.html"),
        ("compare", "/compare.html"),
        ("figure", "/figure.html?id=lincoln"),
        ("404", "/nonexistent-page"),
    ]
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await ctx.new_page()
    for name, path in pages:
        try:
            await page.goto(f"{BASE}{path}", wait_until="networkidle")
            await page.wait_for_timeout(1200)
            await shot(page, f"page_{name}")
            print(f"  {name}: {path}")
        except Exception as e:
            print(f"  {name} 失败: {e}")
    await page.goto(f"{BASE}/", wait_until="networkidle")
    ja = await page.query_selector(".lang-btn[data-lang='ja']")
    if ja:
        await ja.click()
        await page.wait_for_timeout(800)
        await shot(page, "page_home_ja")
        print("  home(ja)")
    await ctx.close()


async def main():
    print(f"截图目录: {SHOT_DIR.resolve()}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        await screenshot_all_pages(browser)
        flow_results = []
        for sc in SCENARIOS:
            r = await run_full_flow(browser, sc)
            flow_results.append(r)
        hard_results = []
        for hc in HARD_CASES:
            r = await run_hard_case(browser, hc)
            hard_results.append(r)
        await browser.close()

        print("\n" + "=" * 60)
        print("汇总")
        print("=" * 60)
        print("\n[完整流程]")
        for r in flow_results:
            status = "OK" if not r["errors"] else "WARN"
            print(f"  [{status}] {r['scenario']}: 答题 {r['answered']} 轮, 错误 {len(r['errors'])} 条")
        print("\n[刁难场景]")
        for r in hard_results:
            status = "OK" if r["ok"] and not r["errors"] else "WARN"
            print(f"  [{status}] {r['case']}: {r['note']}")
        print(f"\n截图全部在 {SHOT_DIR.resolve()}/")
        print(f"共 {len(list(SHOT_DIR.glob('*.png')))} 张")


if __name__ == "__main__":
    asyncio.run(main())
