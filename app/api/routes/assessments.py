"""测评相关路由 —— 列表、题库、元信息。"""

from fastapi import APIRouter, HTTPException

from app.data import list_banks, load_bank

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


@router.get("")
async def list_assessments() -> list[dict]:
    """三面镜子列表 —— 给首页用。"""
    banks = list_banks()
    return [
        {
            "type": b.assessment_type,
            "title": b.title,
            "description": b.description,
            "estimated_minutes": b.estimated_minutes,
            "question_count": len(b.questions),
            "dimensions": b.dimensions,
        }
        for b in banks.values()
    ]


@router.get("/{assessment_type}/questions")
async def get_questions(assessment_type: str) -> dict:
    """取某面镜子的题目(整批下发,前端控制节奏)。"""
    try:
        bank = load_bank(assessment_type)
    except FileNotFoundError as e:
        raise HTTPException(404, f"测评不存在: {assessment_type}") from e
    return {
        "assessment_type": bank.assessment_type,
        "title": bank.title,
        "description": bank.description,
        "estimated_minutes": bank.estimated_minutes,
        "dimensions": bank.dimensions,
        "questions": [q.model_dump() for q in bank.questions],
    }
