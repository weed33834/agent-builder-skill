"""会话路由 —— 开始/恢复/提交答案。"""

import pendulum
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.data import load_bank
from app.models.result import Result
from app.models.session import AssessmentSession, SessionStatus
from app.schemas.session import SessionOut, SubmitAnswersIn
from app.services import compute_result

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("")
async def start_session(
    assessment_type: str,
    user: CurrentUser,
    db: DbSession,
    restart: bool = False,
) -> SessionOut:
    """开始一次测评。若有未完成草稿默认恢复;restart=true 放弃草稿重开。"""
    try:
        load_bank(assessment_type)
    except FileNotFoundError:
        raise HTTPException(404, f"测评不存在: {assessment_type}")

    # 找未完成草稿
    existing = await db.execute(
        select(AssessmentSession).where(
            AssessmentSession.user_id == user.id,
            AssessmentSession.assessment_type == assessment_type,
            AssessmentSession.status == SessionStatus.in_progress,
        )
    )
    if (session := existing.scalar_one_or_none()):
        if restart:
            # 放弃旧草稿,标记 abandoned
            session.status = SessionStatus.abandoned
            await db.commit()
        else:
            return SessionOut.model_validate(session, from_attributes=True)

    session = AssessmentSession(
        user_id=user.id,
        assessment_type=assessment_type,
        started_at=pendulum.now(),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionOut.model_validate(session, from_attributes=True)


@router.post("/{session_id}/responses")
async def submit_responses(
    session_id: str,
    payload: SubmitAnswersIn,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    """提交答案。complete=True 触发计分并返回结果;False 仅存草稿。"""
    session = await db.get(AssessmentSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "会话不存在")
    if session.status != SessionStatus.in_progress:
        raise HTTPException(409, f"会话已 {session.status.value},不可重复提交")

    # 写草稿 + 行为轨迹
    draft = {a.question_id: a.answer for a in payload.answers}
    behavior = {
        a.question_id: {
            "duration_ms": a.duration_ms,
            "change_count": a.change_count,
            "trajectory": a.trajectory,
        }
        for a in payload.answers
    }
    session.draft_answers = {**(session.draft_answers or {}), **draft}
    session.behavior_log = {**(session.behavior_log or {}), **behavior}
    bank = load_bank(session.assessment_type)
    session.current_index = min(len(session.draft_answers), len(bank.questions))

    if not payload.complete:
        await db.commit()
        return {"status": "draft_saved", "current_index": session.current_index}

    # 完整提交 → 计分
    session.status = SessionStatus.completed
    session.finished_at = pendulum.now()
    result_data = compute_result(session, payload)

    result = Result(
        session_id=session.id,
        user_id=user.id,
        assessment_type=session.assessment_type,
        **result_data,
    )
    db.add(result)
    await db.commit()
    await db.refresh(result)
    return {"status": "completed", "result_id": result.id}
