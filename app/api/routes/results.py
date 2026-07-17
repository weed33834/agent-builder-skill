"""结果路由 —— 查看报告、历史。"""

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, RequireUser
from app.models.result import Result
from app.schemas.compare import CompareOut, ComparePublicOut
from app.schemas.result import ResultOut, ResultSummary
from app.services.compare import compare as compare_svc, public_summary

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


@router.get("/results/{result_id}/public")
async def get_public(result_id: str, db: DbSession) -> ComparePublicOut:
    """公开摘要(对比码目标)。无鉴权:仅暴露维度百分位/标签/结论,不泄露归属。"""
    r = await db.get(Result, result_id)
    if not r:
        raise HTTPException(404, "资源不存在")
    return ComparePublicOut(**public_summary(r))


@router.get("/compare")
async def compare(
    other: str = Query(..., description="对方结果 id(对比码)"),
    user: RequireUser = None,
    db: DbSession = None,
) -> CompareOut:
    """当前用户最新结果 vs 对方公开摘要。"""
    other_r = await db.get(Result, other)
    if not other_r:
        raise HTTPException(404, "资源不存在")
    self_r = (
        await db.execute(
            select(Result)
            .where(Result.user_id == user.id)
            .order_by(Result.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not self_r:
        raise HTTPException(404, "资源不存在")
    return CompareOut(**compare_svc(self_r, other_r))
