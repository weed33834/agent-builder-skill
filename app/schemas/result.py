"""结果输出 schema。"""

from pydantic import BaseModel, Field


class MatchItem(BaseModel):
    id: str
    name: str
    match_pct: float
    blurb: str
    # 名人镜专用:SVG 肖像路径与名言。value/ideology matcher 不返回,默认空串。
    image: str = ""
    quote: str = ""


class ResultOut(BaseModel):
    id: str
    assessment_type: str
    summary: str
    dimensions: dict[str, float]
    matches: list[MatchItem]
    conflicts: list[dict]
    insights: dict
    percentiles: dict[str, float]
    # #17 修复:使用 Field(default_factory=dict) 避免可变默认值
    profile: dict = Field(default_factory=dict)  # 综合画像标签 {tags: [...]}


class ResultSummary(BaseModel):
    """历史结果摘要(列表用)。"""

    id: str
    assessment_type: str
    summary: str
    created_at: str
    # #17 修复:使用 Field(default_factory=dict)
    profile: dict = Field(default_factory=dict)  # 画像标签(可选,用于历史列表展示)
