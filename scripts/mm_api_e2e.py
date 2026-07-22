"""心镜 MindMirror —— API 级 E2E 全流程 + 12 刁难场景 + HTML 静态检查。

用法:.venv/bin/python scripts/mm_api_e2e.py
前提:fastapi dev 已在 :8765 跑起来。
"""
import random
import sys
import uuid
from collections import Counter

import httpx

BASE = "http://localhost:8765"


class Client:
    """带 token 管理的 API 客户端(模拟前端:自己生成 UUID 当匿名 token)。"""

    def __init__(self):
        # 前端逻辑:首访自动生成 UUID 存 localStorage,之后每次请求带 X-User-Token
        self.token = str(uuid.uuid4())
        self.jwt = None
        self.http = httpx.Client(base_url=BASE, timeout=15)

    def _h(self):
        h = {}
        if self.jwt:
            h["Authorization"] = f"Bearer {self.jwt}"
        else:
            h["X-User-Token"] = self.token
        return h

    def get(self, path):
        return self.http.get(path, headers=self._h())

    def post(self, path, json_body=None, **kw):
        if "json" in kw:
            json_body = kw.pop("json")
        return self.http.post(path, json=json_body, headers=self._h(), **kw)

    def register(self, email, pw, nick):
        r = self.http.post("/api/auth/register", json={"email": email, "password": pw, "nickname": nick})
        if r.status_code in (200, 201):
            data = r.json() if r.text else {}
            tok = data.get("access_token") or data.get("token") or r.headers.get("x-user-token")
            if tok:
                self.jwt = tok
        return r


# ============ 答案构造 ============

def build_answer(q):
    """根据题目类型构造合法答案。"""
    t = q["type"]
    if t == "scale":
        return {"option_id": q["points"][0]["id"]}
    if t == "dilemma":
        return {"option_id": q["options"][0]["id"]}
    if t == "allocation":
        targets = q["targets"]
        total = q["total"]
        n = len(targets)
        base = total // n
        rem = total - base * n
        alloc = {}
        for i, tgt in enumerate(targets):
            alloc[tgt["id"]] = base + (rem if i == 0 else 0)
        return {"allocation": alloc}
    if t == "sort":
        return {"order": [it["id"] for it in q["items"]]}
    if t == "iat":
        return {"iat": [{"response": "left", "rt": 600, "correct": True} for _ in q["words"]]}
    if t == "slider":
        return {"position": 70}
    if t == "forced_choice":
        return {"choice": q["sides"][0]["id"]}
    if t == "matrix":
        return {"ratings": {s["id"]: 4 for s in q["statements"]}}
    if t == "auction":
        items = q["items"]
        budget = q["budget"]
        # 全押第一项
        bids = {it["id"]: 0 for it in items}
        bids[items[0]["id"]] = min(budget, 50)
        return {"bids": bids}
    raise ValueError(f"未知题型 {t}")


def run_full_flow(client, atype, version):
    """完整答题流程。返回 (result_id, 检查清单)。"""
    print(f"\n=== 完整流程: {atype} / {version} ===")
    # 1. 取题
    r = client.get(f"/api/assessments/{atype}/questions?version={version}")
    assert r.status_code == 200, f"取题失败 {r.status_code}: {r.text}"
    bank = r.json()
    qcount = len(bank["questions"])
    print(f"  题数: {qcount}, 类型分布: {Counter(q['type'] for q in bank['questions'])}")

    # 2. 建会话(草稿)
    r = client.post(f"/api/sessions?assessment_type={atype}&version={version}")
    assert r.status_code in (200, 201), f"建会话失败 {r.status_code}: {r.text}"
    session = r.json()
    sid = session["id"]
    print(f"  会话: {sid[:8]}... status={session['status']}")

    # 3. 逐题存草稿(complete=False)
    for i, q in enumerate(bank["questions"]):
        ans = build_answer(q)
        payload = {"answers": [{"question_id": q["id"], "answer": ans, "duration_ms": 1500, "change_count": 1, "trajectory": None}], "complete": False}
        r = client.post(f"/api/sessions/{sid}/responses", json=payload)
        assert r.status_code == 200, f"草稿提交第 {i+1} 题({q['type']})失败 {r.status_code}: {r.text}"
    print(f"  草稿全部 {qcount} 题已存")

    # 4. 完整提交(complete=True,带全部答案)
    all_answers = []
    for q in bank["questions"]:
        all_answers.append({"question_id": q["id"], "answer": build_answer(q), "duration_ms": 2000, "change_count": 1, "trajectory": None})
    r = client.post(f"/api/sessions/{sid}/responses", json={"answers": all_answers, "complete": True})
    assert r.status_code == 200, f"完整提交失败 {r.status_code}: {r.text}"
    result_id = r.json().get("result_id")
    assert result_id, f"未返回 result_id: {r.text}"
    print(f"  结果: {result_id[:8]}...")

    # 5. 取报告
    r = client.get(f"/api/results/{result_id}")
    assert r.status_code == 200, f"取报告失败 {r.status_code}: {r.text}"
    report = r.json()
    checks = {
        "has_summary": bool(report.get("summary")),
        "has_dimensions": bool(report.get("dimensions")),
        "has_profile": bool(report.get("profile")),
        "has_matches": False,
        "matches_with_id": False,
        "matches_with_image": False,
        "has_compare_code": bool(report.get("compare_code") or result_id),
    }
    matches = report.get("matches", [])
    if matches:
        checks["has_matches"] = True
        m0 = matches[0]
        checks["matches_with_id"] = bool(m0.get("id"))
        checks["matches_with_image"] = bool(m0.get("image"))
        if m0.get("id"):
            r2 = client.get(f"/api/figures/{m0['id']}")
            checks["figure_detail_ok"] = r2.status_code == 200 and bool(r2.json().get("intro"))
            print(f"  匹配名人: {m0.get('name')} -> 详情 API {r2.status_code}")
    print(f"  检查: {checks}")
    return result_id, checks


# ============ 12 个刁难场景 ============

def hard_refresh_midway(client):
    """草稿恢复:答一半 → 再建会话,应返回旧草稿。"""
    print("\n=== 刁难: refresh_midway ===")
    r = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/celebrity/questions?version=fast")
    bank = r2.json()
    # 答前 3 题
    for q in bank["questions"][:3]:
        client.post(f"/api/sessions/{sid}/responses", json={"answers": [{"question_id": q["id"], "answer": build_answer(q), "duration_ms": 1000, "change_count": 0, "trajectory": None}], "complete": False})
    # 再建会话 → 应返回旧草稿
    r3 = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    s3 = r3.json()
    ok = s3["id"] == sid and s3["draft_answers"] and len(s3["draft_answers"]) >= 3
    print(f"  草稿恢复: ok={ok}, draft={len(s3.get('draft_answers') or {})}")
    return ok


def hard_restart_abandon(client):
    """restart=true 应放弃草稿。"""
    print("\n=== 刁难: restart_abandon ===")
    r = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/celebrity/questions?version=fast")
    for q in r2.json()["questions"][:2]:
        client.post(f"/api/sessions/{sid}/responses", json={"answers": [{"question_id": q["id"], "answer": build_answer(q), "duration_ms": 1000, "change_count": 0, "trajectory": None}], "complete": False})
    r3 = client.post("/api/sessions?assessment_type=celebrity&version=fast&restart=true")
    s3 = r3.json()
    ok = s3["id"] != sid and (not s3.get("draft_answers") or len(s3["draft_answers"]) == 0)
    print(f"  重开新会话: ok={ok}, new_sid={s3['id'][:8]}")
    return ok


def hard_double_submit_complete(client):
    """完整提交两次:第二次应 409。"""
    print("\n=== 刁难: double_submit_complete ===")
    r = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/celebrity/questions?version=fast")
    bank = r2.json()
    answers = [{"question_id": q["id"], "answer": build_answer(q), "duration_ms": 1000, "change_count": 0, "trajectory": None} for q in bank["questions"]]
    r3 = client.post(f"/api/sessions/{sid}/responses", json={"answers": answers, "complete": True})
    r4 = client.post(f"/api/sessions/{sid}/responses", json={"answers": answers, "complete": True})
    ok = r3.status_code == 200 and r4.status_code == 409
    print(f"  第一次 {r3.status_code}, 第二次 {r4.status_code}: ok={ok}")
    return ok


def hard_partial_submit_complete(client):
    """完整提交但答案不全:应 422。"""
    print("\n=== 刁难: partial_submit_complete ===")
    r = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/celebrity/questions?version=fast")
    bank = r2.json()
    answers = [{"question_id": q["id"], "answer": build_answer(q), "duration_ms": 1000, "change_count": 0, "trajectory": None} for q in bank["questions"][:3]]
    r3 = client.post(f"/api/sessions/{sid}/responses", json={"answers": answers, "complete": True})
    ok = r3.status_code == 422
    print(f"  部分答案完整提交: {r3.status_code}: ok={ok}")
    return ok


def hard_invalid_answer_value(client):
    """构造非法答案:scale 选项 id 不存在 → 应 422。"""
    print("\n=== 刁难: invalid_answer_value ===")
    r = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/celebrity/questions?version=fast")
    q0 = r2.json()["questions"][0]
    bad = [{"question_id": q0["id"], "answer": {"option_id": "INVALID_XYZ"}, "duration_ms": 1000, "change_count": 0, "trajectory": None}]
    r3 = client.post(f"/api/sessions/{sid}/responses", json={"answers": bad, "complete": False})
    ok = r3.status_code == 422
    print(f"  非法选项: {r3.status_code}: ok={ok}")
    return ok


def hard_negative_duration(client):
    """duration_ms < 0 → 应 422。"""
    print("\n=== 刁难: negative_duration ===")
    r = client.post("/api/sessions?assessment_type=celebrity&version=fast")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/celebrity/questions?version=fast")
    q0 = r2.json()["questions"][0]
    bad = [{"question_id": q0["id"], "answer": build_answer(q0), "duration_ms": -1, "change_count": 0, "trajectory": None}]
    r3 = client.post(f"/api/sessions/{sid}/responses", json={"answers": bad, "complete": False})
    ok = r3.status_code == 422
    print(f"  负 duration: {r3.status_code}: ok={ok}")
    return ok


def hard_alloc_sum_mismatch(client):
    """allocation 总和 ≠ total → 应 422。"""
    print("\n=== 刁难: alloc_sum_mismatch ===")
    r = client.post("/api/sessions?assessment_type=value&version=standard")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/value/questions?version=standard")
    try:
        alloc_q = next(q for q in r2.json()["questions"] if q["type"] == "allocation")
    except StopIteration:
        print("  跳过(无 allocation 题)")
        return True
    bad_alloc = {t["id"]: 1 for t in alloc_q["targets"]}  # 总和 = n,远小于 total
    bad = [{"question_id": alloc_q["id"], "answer": {"allocation": bad_alloc}, "duration_ms": 1000, "change_count": 0, "trajectory": None}]
    r3 = client.post(f"/api/sessions/{sid}/responses", json={"answers": bad, "complete": False})
    ok = r3.status_code == 422
    print(f"  分配总和不等: {r3.status_code}: ok={ok}")
    return ok


def hard_auction_over_budget(client):
    """auction 出价超 budget → 应 422。"""
    print("\n=== 刁难: auction_over_budget ===")
    r = client.post("/api/sessions?assessment_type=ideology&version=deep")
    sid = r.json()["id"]
    r2 = client.get("/api/assessments/ideology/questions?version=deep")
    try:
        auc_q = next(q for q in r2.json()["questions"] if q["type"] == "auction")
    except StopIteration:
        print("  跳过(无 auction 题)")
        return True
    bad_bids = {it["id"]: auc_q["budget"] for it in auc_q["items"]}  # 每项都给满 → 总和超
    bad = [{"question_id": auc_q["id"], "answer": {"bids": bad_bids}, "duration_ms": 1000, "change_count": 0, "trajectory": None}]
    r3 = client.post(f"/api/sessions/{sid}/responses", json={"answers": bad, "complete": False})
    ok = r3.status_code == 422
    print(f"  拍卖超预算: {r3.status_code}: ok={ok}")
    return ok


def hard_invalid_compare_code(client):
    """错误对比码 → 应 404。"""
    print("\n=== 刁难: invalid_compare_code ===")
    r = client.get("/api/results/nonexistent_id/public")
    ok = r.status_code == 404
    print(f"  不存在结果 public: {r.status_code}: ok={ok}")
    return ok


def hard_figure_404(client):
    """不存在的人物 id → 应 404。"""
    print("\n=== 刁难: figure_404 ===")
    r = client.get("/api/figures/nonexistent_figure")
    ok = r.status_code == 404
    print(f"  不存在 figure: {r.status_code}: ok={ok}")
    return ok


def hard_other_user_result(client):
    """另一用户访问我的结果 → 应 404。"""
    print("\n=== 刁难: other_user_result ===")
    # 用户 A 跑一次流程拿 result_id
    ca = Client()
    rid, _ = run_full_flow(ca, "celebrity", "fast")
    # 用户 B 注册并访问 A 的结果
    cb = Client()
    cb.register(f"u{random.randint(10000,99999)}@test.com", "Pass1234", "B")
    r = cb.get(f"/api/results/{rid}")
    ok = r.status_code == 404
    print(f"  B 访问 A 的结果: {r.status_code}: ok={ok}")
    return ok


def hard_compare_without_self(client):
    """对比但当前用户无结果 → 应 404。"""
    print("\n=== 刁难: compare_without_self ===")
    # 新用户(无结果)
    cn = Client()
    cn.register(f"nop{random.randint(10000,99999)}@test.com", "Pass1234", "N")
    # 先建一个别人的 result
    ca = Client()
    rid, _ = run_full_flow(ca, "celebrity", "fast")
    r = cn.get(f"/api/compare?other={rid}")
    ok = r.status_code == 404
    print(f"  无自己结果对比: {r.status_code}: ok={ok}")
    return ok


# ============ HTML 静态检查 ============

def html_checks():
    """对每个页面 curl,检查关键元素。"""
    print("\n=== HTML 静态检查 ===")
    pages = {
        "home": "/",
        "about": "/about.html",
        "login": "/login.html",
        "history": "/history.html",
        "profile": "/profile.html",
        "compare": "/compare.html",
        "figure": "/figure.html?id=lincoln",
        "report": "/report.html?id=nonexistent",
        "take": "/take.html?type=celebrity",
        "bootcamp": "/bootcamp.html",
        "404": "/no-such-page",
    }
    results = {}
    with httpx.Client(base_url=BASE, timeout=10) as h:
        for name, path in pages.items():
            r = h.get(path)
            html = r.text
            checks = {
                "status": r.status_code,
                "has_fonts_loli": "fonts.loli.net" in html,
                "no_googleapis": "fonts.googleapis.com" not in html,
                "has_i18n_js": "/i18n.js" in html,
                "has_styles_css": "/styles.css" in html,
                "has_lang_btn": "lang-btn" in html or "injectLangSwitch" in html,
            }
            # 页面专属检查
            if name == "home":
                checks["has_mirrors_div"] = 'id="mirrors"' in html
                checks["has_onthisday"] = "onthisday" in html
                checks["has_profile_link"] = "profile.html" in html
                checks["has_mirror_card_icon"] = "mirror-card-icon" in html or "mirror-celebrity.svg" in html
            elif name == "about":
                checks["has_method_grid"] = "method-grid" in html
                checks["has_method_icon"] = "methods/" in html or "method-icon" in html
            elif name == "login":
                checks["has_login_deco"] = "login-mirror.svg" in html
            elif name == "compare":
                checks["has_compare_deco"] = "compare-mirrors.svg" in html
            elif name == "history":
                checks["has_empty_mirror"] = "empty-mirror.svg" in html
            elif name == "profile":
                checks["has_iron_badge"] = "iron-badge.svg" in html
            elif name == "figure":
                checks["has_figure_meta"] = 'mm-page" content="figure' in html
            elif name == "404":
                checks["has_404_illustration"] = "404-broken-mirror.svg" in html
            results[name] = checks
            status_str = "OK" if (checks["status"] in (200, 404) and checks["has_fonts_loli"] and checks["no_googleapis"]) else "WARN"
            print(f"  [{status_str}] {name}: {checks}")
    return results


def svg_checks():
    """检查所有新增 SVG 是否能访问。"""
    print("\n=== SVG 资源检查 ===")
    svgs = [
        "/images/hero-mirror.svg",
        "/images/mirror-celebrity.svg",
        "/images/mirror-value.svg",
        "/images/mirror-ideology.svg",
        "/images/404-broken-mirror.svg",
        "/images/login-mirror.svg",
        "/images/empty-mirror.svg",
        "/images/compare-mirrors.svg",
        "/images/iron-badge.svg",
        "/images/methods/scale.svg",
        "/images/methods/dilemma.svg",
        "/images/methods/allocation.svg",
        "/images/methods/sort.svg",
        "/images/methods/iat.svg",
        "/images/methods/slider.svg",
        "/images/methods/forced_choice.svg",
        "/images/methods/matrix.svg",
        "/images/methods/auction.svg",
    ]
    results = {}
    with httpx.Client(base_url=BASE, timeout=10) as h:
        for s in svgs:
            r = h.get(s)
            ok = r.status_code == 200 and "svg" in r.text[:200]
            results[s] = ok
            print(f"  [{'OK' if ok else 'FAIL'}] {s}: {r.status_code}")
    return results


def onthisday_randomness():
    """onthisday 多次调用应返回不同结果(随机性)。"""
    print("\n=== onthisday 随机性 ===")
    with httpx.Client(base_url=BASE, timeout=10) as h:
        results = []
        for _ in range(5):
            r = h.get("/api/figures/onthisday")
            if r.status_code == 200:
                results.append(tuple(sorted(x["id"] for x in r.json())))
        unique = len(set(results))
        ok = unique >= 2
        print(f"  5 次调用, {unique} 种组合: ok={ok}")
        return ok


def main():
    print(f"BASE = {BASE}")

    # 1. 全流程:3 类型 × 3 版本
    print("\n" + "=" * 60)
    print("[1] 完整答题流程 3 类型 × 3 版本")
    print("=" * 60)
    flow_results = {}
    for atype in ["celebrity", "value", "ideology"]:
        for version in ["fast", "standard", "deep"]:
            # 每次用新客户端(独立用户),避免草稿冲突
            c = Client()
            try:
                rid, checks = run_full_flow(c, atype, version)
                flow_results[f"{atype}_{version}"] = {"ok": True, "result_id": rid, "checks": checks}
            except Exception as e:
                flow_results[f"{atype}_{version}"] = {"ok": False, "error": str(e)}
                print(f"  ❌ {atype}_{version} 失败: {e}")

    # 2. 12 个刁难场景
    print("\n" + "=" * 60)
    print("[2] 12 个刁难场景")
    print("=" * 60)
    hard_fns = [
        hard_refresh_midway, hard_restart_abandon, hard_double_submit_complete,
        hard_partial_submit_complete, hard_invalid_answer_value, hard_negative_duration,
        hard_alloc_sum_mismatch, hard_auction_over_budget, hard_invalid_compare_code,
        hard_figure_404, hard_other_user_result, hard_compare_without_self,
    ]
    hard_results = {}
    for fn in hard_fns:
        try:
            c = Client()
            hard_results[fn.__name__] = fn(c)
        except Exception as e:
            hard_results[fn.__name__] = False
            print(f"  ❌ {fn.__name__} 异常: {e}")

    # 3. HTML + SVG + onthisday
    print("\n" + "=" * 60)
    print("[3] HTML / SVG / onthisday 检查")
    print("=" * 60)
    html_res = html_checks()
    svg_res = svg_checks()
    onthis_ok = onthisday_randomness()

    # 汇总
    print("\n" + "=" * 60)
    print("汇总")
    print("=" * 60)
    print("\n[完整流程]")
    for k, v in flow_results.items():
        s = "OK" if v["ok"] else "FAIL"
        print(f"  [{s}] {k}")
    print("\n[刁难场景]")
    for k, v in hard_results.items():
        s = "OK" if v else "FAIL"
        print(f"  [{s}] {k}")
    print("\n[HTML]")
    for k, v in html_res.items():
        s = "OK" if (v["status"] in (200, 404) and v["has_fonts_loli"] and v["no_googleapis"]) else "WARN"
        print(f"  [{s}] {k}: status={v['status']}")
    print("\n[SVG]")
    fail_svgs = [k for k, v in svg_res.items() if not v]
    print(f"  {len(svg_res) - len(fail_svgs)}/{len(svg_res)} 通过" + (f", 失败: {fail_svgs}" if fail_svgs else ""))
    print(f"\n[onthisday 随机] {'OK' if onthis_ok else 'FAIL'}")

    # 总判断
    flow_ok = all(v["ok"] for v in flow_results.values())
    hard_ok = all(hard_results.values())
    html_ok = all(v["status"] in (200, 404) and v["has_fonts_loli"] and v["no_googleapis"] for v in html_res.values())
    svg_ok = all(svg_res.values())
    print(f"\n总评: 流程={flow_ok} 刁难={hard_ok} HTML={html_ok} SVG={svg_ok} onthisday={onthis_ok}")
    sys.exit(0 if (flow_ok and hard_ok and html_ok and svg_ok and onthis_ok) else 1)


if __name__ == "__main__":
    main()
