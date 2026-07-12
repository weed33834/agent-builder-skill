"""题库加载器 —— 从 data/questions/*.yaml 加载,带缓存。"""

from functools import lru_cache
from pathlib import Path

import yaml

from app.schemas.question import QuestionBank

BANKS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "questions"


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
