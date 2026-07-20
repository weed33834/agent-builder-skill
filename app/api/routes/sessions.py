"""会话路由 —— 开始/恢复/提交答案。"""

import logging
from typing import Literal

import pendulum
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.data import load_bank
from app.models.result import Result
from app.models.session import AssessmentSession, SessionStatus
from app.schemas.session import AnswerItem, SessionOut, SubmitAnswersIn
from app.services import compute_result, validate_answers

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# #25 修复:统一约束 assessment_type 为已知枚举值
AssessmentType = Literal["celebrity", "value", "ideology"]


@router.post("")
async def start_session(
    assessment_type: AssessmentType,
    user: CurrentUser,
    db: DbSession,
    restart: bool = False,
) -> SessionOut:
    """开始一次测评。若有未完成草稿默认恢复;restart=true 放弃草稿重开。"""
    try:
        load_bank(assessment_type)
    except FileNotFoundError as e:
        raise HTTPException(404, f"测评不存在: {assessment_type}") from e

    # 找未完成草稿 —— 用 all() 防御并发创建导致的多条记录
    existing = await db.execute(
        select(AssessmentSession).where(
            AssessmentSession.user_id == user.id,
            AssessmentSession.assessment_type == assessment_type,
            AssessmentSession.status == SessionStatus.in_progress,
        )
    )
    sessions = existing.scalars().all()

    if sessions:
        if restart:
            # 放弃所有旧草稿(防御并发产生的多条)
            for s in sessions:
                s.status = SessionStatus.abandoned
            await db.commit()
        else:
            # 恢复第一条,其余标记 abandoned
            if len(sessions) > 1:
                logger.warning("用户 %s 测评 %s 存在 %d 条进行中会话,自动清理",
                               user.id, assessment_type, len(sessions))
                for s in sessions[1:]:
                    s.status = SessionStatus.abandoned
                await db.commit()
            return SessionOut.model_validate(sessions[0], from_attributes=True)

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

    # 服务端校验答案合法性(#3)
    try:
        validate_answers(session.assessment_type, payload)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e

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

    # 完整提交 → 用已合并的草稿答案计分(#4 修复:不再用 payload 而用 session.draft_answers)
    full_payload = _build_full_payload(session)
    # 再次校验完整性(草稿合并后必须覆盖全部题目)
    try:
        validate_answers(session.assessment_type, full_payload)
    except ValueError as e:
        await db.commit()  # 先保存草稿
        raise HTTPException(422, str(e)) from e

    prev_status = session.status
    session.status = SessionStatus.completed
    session.finished_at = pendulum.now()
    try:
        result_data = compute_result(session, full_payload)
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
    except HTTPException:
        # 业务校验异常,回滚状态后向上抛
        await db.rollback()
        session = await db.get(AssessmentSession, session_id)
        if session:
            session.status = prev_status
            session.finished_at = None
            await db.commit()
        raise
    except Exception:
        # 计分异常:回滚 session 状态,记录日志,返回 500
        logger.exception("会话 %s 计分失败", session_id)
        await db.rollback()
        session = await db.get(AssessmentSession, session_id)
        if session:
            session.status = prev_status
            session.finished_at = None
            await db.commit()
        raise HTTPException(500, "计分处理失败,请重试") from None


def _build_full_payload(session: AssessmentSession) -> SubmitAnswersIn:
    """从 session.draft_answers + behavior_log 构建完整的提交载荷。

    #4 修复:计分应基于已合并的全部草稿答案,而非仅当前请求的 payload。
    """
    answers = []
    draft = session.draft_answers or {}
    behavior = session.behavior_log or {}
    for qid, ans_dict in draft.items():
        b = behavior.get(qid, {})
        answers.append(AnswerItem(
            question_id=qid,
            answer=ans_dict,
            duration_ms=b.get("duration_ms", 0),
            change_count=b.get("change_count", 0),
            trajectory=b.get("trajectory"),
        ))
    return SubmitAnswersIn(answers=answers, complete=True)
