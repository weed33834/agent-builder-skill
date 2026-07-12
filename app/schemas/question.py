"""题目 schema —— 用 Pydantic 鉴别联合,按 type 字段自动解析对应题型。

题型分类(对应设计方案):
- scale        量表题(5/7点,记犹豫)
- dilemma      困境选择题(限时,超时记本能)
- allocation   资源分配题(滑块,总和=100)
- sort         排序题(拖拽,记轨迹)
- iat          内隐联想(快速分类,记反应时)
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field


class Option(BaseModel):
    """选项 —— 含维度得分映射,用于计分。"""
    id: str
    text: str
    # {dimension: delta_score} 此选项对每个维度的贡献
    scores: dict[str, float] = Field(default_factory=dict)


class BaseQuestion(BaseModel):
    id: str
    type: str
    prompt: str
    time_limit_sec: int | None = None  # 限时题;None = 无限
    dimensions: list[str] = Field(default_factory=list)  # 此题涉及的维度


class ScaleQuestion(BaseQuestion):
    type: Literal["scale"] = "scale"
    # 量表点数(5 或 7),每点对应一个分数映射
    points: list[Option]  # 长度即点数


class DilemmaQuestion(BaseQuestion):
    type: Literal["dilemma"] = "dilemma"
    scenario: str  # 情境描述
    options: list[Option]  # 2-4 个抉择
    # 历史名人真实困境(仅名人镜用)
    historical_figure: str | None = None
    historical_choice: str | None = None  # 该名人的实际选择


class AllocationQuestion(BaseQuestion):
    type: Literal["allocation"] = "allocation"
    # 分配对象,每个对象对应一个维度(分配比例直接量化优先级)
    targets: list[Option]  # id/text/scores(此处 scores 为单维度标识)
    total: int = 100


class SortQuestion(BaseQuestion):
    type: Literal["sort"] = "sort"
    items: list[Option]  # 待排序项,排序位置决定权重


class IATQuestion(BaseQuestion):
    type: Literal["iat"] = "iat"
    # 左右两类的标签 + 词语,反应时差反映潜意识偏好
    left_label: str
    right_label: str
    words: list[dict]  # [{word, category}] category 决定正确侧


Question = Annotated[
    ScaleQuestion | DilemmaQuestion | AllocationQuestion | SortQuestion | IATQuestion,
    Field(discriminator="type"),
]


class QuestionBank(BaseModel):
    """题库结构 —— 对应一个 YAML 文件。"""
    assessment_type: str
    title: str
    description: str
    estimated_minutes: int
    dimensions: list[str]  # 本测评涉及的维度全集
    questions: list[Question]
