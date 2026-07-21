"""会话相关 schema。"""

from datetime import datetime

from pydantic import BaseModel


class SessionOut(BaseModel):
    id: str
    assessment_type: str
    status: str
    version: str = "standard"  # fast | standard | deep
    current_index: int
    draft_answers: dict | None = None
    behavior_log: dict | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class AnswerItem(BaseModel):
    """单题答案 —— 含答案与行为轨迹(耗时/修改次数/路径)。"""
    question_id: str
    answer: dict  # {option_id} / {allocation: {...}} / {order: [...]} / {iat: [...]}
    # 行为轨迹(前端采集)
    duration_ms: int = 0
    change_count: int = 0
    trajectory: list | None = None  # 滑块路径/拖拽路径:[{t, value}, ...]


class SubmitAnswersIn(BaseModel):
    answers: list[AnswerItem]
    complete: bool = True  # True=最终提交;False=存草稿
