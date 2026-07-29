"""构建前端题库 —— 把 YAML 题库/名人库/意识形态库转成 TS 模块。

迁移自原项目 scripts/build_bank.py,差异:
- 输出从 static/data/*.json 改为 src/data/*.ts(TS 模块直接 import)
- YAML 源流不变(data/*.yaml),字段名不变,只是序列化格式变 TS
- 产物带类型注解,前端 import 时获得完整类型提示

运行:python scripts/build_bank.py  (需 pyyaml)
生成:src/data/{questions,figures,ideologies}/*.ts + assessments.ts
"""
from __future__ import annotations

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "src" / "data"

# 版本→tier 上限(与 scoring.ts 的 TIERS 一致)
_TIERS = {"fast": 1, "standard": 2, "deep": 3}


def _to_ts_literal(obj: object, indent: int = 2) -> str:
    """把 Python 对象序列化为 TS 字面量(非 JSON,保留中文可读性)。
    与 JSON 兼容,TS 可直接 import。"""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ": "))


def _write_ts(var_name: str, type_name: str, obj: object, path: Path) -> None:
    """写一个 TS 模块:默认导出 const,带类型注解。
    type_name 形如 'QuestionBank' 或 'Celebrity[]',import 语句取基础名。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    literal = _to_ts_literal(obj)
    # import 语句只用基础类型名(去掉 [] 后缀)
    base_type = type_name.replace("[]", "")
    content = f"""// 由 scripts/build_bank.py 自动生成,请勿手改。源:data/{path.parent.name}/{path.stem}.yaml
import type {{ {base_type} }} from '@/lib/types'

const {var_name}: {type_name} = {literal}

export default {var_name}
"""
    path.write_text(content, encoding="utf-8")
    print(f"  -> {path.relative_to(ROOT)}")


def main() -> None:
    # 1) 题库(每测评一个文件)+ 汇总 assessments.ts
    qdir = DATA / "questions"
    meta: list[dict] = []
    for path in sorted(qdir.glob("*.yaml")):
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        atype = raw.get("assessment_type")
        if not atype:
            print(f"跳过(无 assessment_type): {path.name}")
            continue
        _write_ts(f"{atype}Bank", "QuestionBank", raw, OUT / "questions" / f"{atype}.ts")
        qs = raw.get("questions") or []
        std_count = sum(1 for q in qs if int(q.get("tier", 1)) <= _TIERS["standard"])
        meta.append({
            "type": atype,
            "title": raw.get("title", atype),
            "description": raw.get("description", ""),
            "estimated_minutes": raw.get("estimated_minutes", 15),
            "question_count": std_count,
            "display_order": raw.get("display_order", 999),
        })
    meta.sort(key=lambda m: (m["display_order"], m["type"]))

    # assessments 是数组,单独写一个汇总模块
    (OUT / "assessments.ts").parent.mkdir(parents=True, exist_ok=True)
    assessments_content = f"""// 由 scripts/build_bank.py 自动生成,请勿手改。
import type {{ AssessmentMeta }} from '@/lib/types'

const assessments: AssessmentMeta[] = {_to_ts_literal(meta)}

export default assessments
"""
    (OUT / "assessments.ts").write_text(assessments_content, encoding="utf-8")
    print(f"  -> src/data/assessments.ts")

    # 2) 名人库
    fig_path = DATA / "figures" / "celebrity.yaml"
    if fig_path.exists():
        fig_data = yaml.safe_load(fig_path.read_text(encoding="utf-8"))
        _write_ts("celebrities", "Celebrity[]", fig_data, OUT / "figures" / "celebrity.ts")

    # 3) 意识形态库
    ideo_path = DATA / "ideologies" / "ideology.yaml"
    if ideo_path.exists():
        ideo_data = yaml.safe_load(ideo_path.read_text(encoding="utf-8"))
        _write_ts("ideologies", "Ideology[]", ideo_data, OUT / "ideologies" / "ideology.ts")

    print("题库构建完成。")


if __name__ == "__main__":
    main()
