"""结果输出 schema。"""

from pydantic import BaseModel


class MatchItem(BaseModel):
    id: str
    name: str
    match_pct: float
    blurb: str


class ResultOut(BaseModel):
    id: str
    assessment_type: str
    summary: str
    dimensions: dict[str, float]
    matches: list[MatchItem]
    conflicts: list[dict]
    insights: dict
    percentiles: dict[str, float]


class ResultSummary(BaseModel):
    """历史结果摘要(列表用)。"""
    id: str
    assessment_type: str
    summary: str
    created_at: str
