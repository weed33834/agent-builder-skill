"""结果路由 —— 查看报告、历史。"""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.models.result import Result
from app.schemas.result import ResultOut, ResultSummary

router = APIRouter(prefix="/api", tags=["results"])


@router.get("/sessions/{session_id}/result")
async def get_result(session_id: str, user: CurrentUser, db: DbSession) -> ResultOut:
    """取某次会话的报告。"""
    result = await db.execute(
        select(Result).where(Result.session_id == session_id, Result.user_id == user.id)
    )
    if r := result.scalar_one_or_none():
        return ResultOut.model_validate(r, from_attributes=True)
    raise HTTPException(404, "结果不存在或尚未完成")


@router.get("/me/results")
async def my_results(user: CurrentUser, db: DbSession) -> list[ResultSummary]:
    """我的历史结果。"""
    rows = await db.execute(
        select(Result).where(Result.user_id == user.id).order_by(Result.created_at.desc())
    )
    return [
        ResultSummary(
            id=r.id,
            assessment_type=r.assessment_type,
            summary=r.summary,
            created_at=r.created_at.isoformat(),
            profile=r.profile,  # #16 修复:传递已生成的 profile
        )
        for r in rows.scalars()
    ]


@router.get("/results/{result_id}")
async def get_result_by_id(result_id: str, user: CurrentUser, db: DbSession) -> ResultOut:
    """按 ID 取单个结果。"""
    r = await db.get(Result, result_id)
    if not r or r.user_id != user.id:
        raise HTTPException(404, "结果不存在")
    return ResultOut.model_validate(r, from_attributes=True)
