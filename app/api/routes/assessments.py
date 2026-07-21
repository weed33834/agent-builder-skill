"""测评相关路由 —— 列表、题库、元信息。"""

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query

from app.data import filter_bank, list_banks, load_bank

router = APIRouter(prefix="/api/assessments", tags=["assessments"])

# 版本查询参数 —— 模块级 Annotated,避免 B008
VersionParam = Annotated[Literal["fast", "standard", "deep"], Query(description="fast|standard|deep")]


@router.get("")
async def list_assessments(
    version: VersionParam = "standard",
) -> list[dict]:
    """三面镜子列表 —— 给首页用。可按 version 过滤题量。"""
    banks = list_banks()
    out = []
    for b in banks.values():
        fb = filter_bank(b, version)
        out.append({
            "type": fb.assessment_type,
            "title": fb.title,
            "description": fb.description,
            "estimated_minutes": fb.estimated_minutes,
            "question_count": len(fb.questions),
            "dimensions": fb.dimensions,
            "version": version,
        })
    return out


@router.get("/{assessment_type}/questions")
async def get_questions(
    assessment_type: str,
    version: VersionParam = "standard",
) -> dict:
    """取某面镜子的题目(整批下发,前端控制节奏)。"""
    try:
        bank = load_bank(assessment_type)
    except FileNotFoundError as e:
        raise HTTPException(404, f"测评不存在: {assessment_type}") from e
    fb = filter_bank(bank, version)
    return {
        "assessment_type": fb.assessment_type,
        "title": fb.title,
        "description": fb.description,
        "estimated_minutes": fb.estimated_minutes,
        "dimensions": fb.dimensions,
        "questions": [q.model_dump() for q in fb.questions],
        "version": version,
    }
