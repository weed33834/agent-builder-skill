"""题库加载器 —— 从 data/questions/*.yaml 加载,带缓存。"""

from functools import lru_cache
from pathlib import Path

import yaml

from app.schemas.question import QuestionBank

BANKS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "questions"

# tier 阈值:fast 包含 tier≤1,standard 包含 tier≤2,deep 包含 tier≤3
VERSION_TIERS: dict[str, int] = {"fast": 1, "standard": 2, "deep": 3}


@lru_cache
def load_bank(assessment_type: str) -> QuestionBank:
    """加载指定测评的题库。题库不存在抛 FileNotFoundError。"""
    path = BANKS_DIR / f"{assessment_type}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"题库不存在: {path}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return QuestionBank.model_validate(raw)


@lru_cache
def list_banks() -> dict[str, QuestionBank]:
    """加载全部题库,返回 {type: bank}。"""
    banks: dict[str, QuestionBank] = {}
    for path in BANKS_DIR.glob("*.yaml"):
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        bank = QuestionBank.model_validate(raw)
        banks[bank.assessment_type] = bank
    return banks


def filter_bank(bank: QuestionBank, version: str = "standard") -> QuestionBank:
    """按 version 过滤题库,返回新 QuestionBank 实例。

    - fast: 仅 tier ≤ 1
    - standard: 仅 tier ≤ 2(默认)
    - deep: 全部(tier ≤ 3)

    过滤后 estimated_minutes 按题量比例缩放,description 末尾追加版本说明。
    """
    if version not in VERSION_TIERS:
        version = "standard"
    max_tier = VERSION_TIERS[version]
    filtered = [q for q in bank.questions if q.tier <= max_tier]
    if len(filtered) == len(bank.questions):
        return bank  # 无需过滤(常见于 deep 版本)
    # 按题量比例估算时长
    ratio = len(filtered) / max(1, len(bank.questions))
    new_minutes = max(2, round(bank.estimated_minutes * ratio))
    return bank.model_copy(update={
        "questions": filtered,
        "estimated_minutes": new_minutes,
    })
