"""关系对比输出 schema。

对比码 = 对方结果 id(ULID);/api/results/{id}/public 仅暴露维度百分位/标签/结论,
不泄露归属,可安全分享。
"""

from pydantic import BaseModel, Field


class ComparePublicOut(BaseModel):
    id: str
    assessment_type: str
    summary: str
    percentiles: dict[str, float] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    archetype: str | None = None


class DimDiff(BaseModel):
    name: str
    self_pct: float
    other_pct: float
    delta: float
    verdict: str


class CompareOut(BaseModel):
    self_summary: ComparePublicOut | None = None
    other_summary: ComparePublicOut
    dimensions: list[DimDiff] = Field(default_factory=list)
    compatibility: int = 0
    verdict: str = ""
