"""题目 schema —— 用 Pydantic 鉴别联合,按 type 字段自动解析对应题型。

题型分类(对应设计方案):
- scale        量表题(5/7点,记犹豫)
- dilemma      困境选择题(限时,超时记本能)
- allocation   资源分配题(滑块,总和=100)
- sort         排序题(拖拽,记轨迹)
- iat          内隐联想(快速分类,记反应时)
- slider       连续滑块题(0-100,测强度/程度)
- forced_choice 强迫二选一(无中立,逼真实偏好)
- matrix       同意度矩阵(多陈述批量Likert)
- auction      价值观拍卖(金币竞拍,测绝对价值)
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


class SliderQuestion(BaseQuestion):
    """连续滑块题 —— 0-100 无级调节,测强度/程度(比5点量表更精细)。

    scores 格式:{dim: {low: -2, high: 2}} 按 position 线性插值。
    position=0 → low 分;position=100 → high 分。
    """
    type: Literal["slider"] = "slider"
    left_label: str  # 左端(0)标签
    right_label: str  # 右端(100)标签
    scores: dict[str, dict[str, float]]  # {dim: {low, high}}


class ForcedChoiceQuestion(BaseQuestion):
    """强迫二选一 —— 两个对立陈述,必须选其一,无中立选项。

    逼出真实偏好(当两个都有吸引力/都排斥时,选择揭示真实优先级)。
    """
    type: Literal["forced_choice"] = "forced_choice"
    sides: list[Option]  # 恰好 2 个,id/text/scores


class MatrixQuestion(BaseQuestion):
    """同意度矩阵 —— 多个陈述批量打同意度(7点Likert)。

    一次问多个相关陈述,高效测量。rating 1=强烈反对 → 7=强烈同意。
    scores 格式:{dim: factor},最终得分 = (rating - 4) / 3 * factor。
    """
    type: Literal["matrix"] = "matrix"
    statements: list[Option]  # id/text/scores(scores 的 value 是权重因子)
    scale_max: int = 7  # 量表最大值,默认7


class AuctionQuestion(BaseQuestion):
    """价值观拍卖 —— 给定预算金币,竞拍多种人生选项。

    与 allocation 区别:预算可省(非零和),测绝对价值强度而非相对权衡。
    出价比例(bid/budget)映射到维度分数。
    """
    type: Literal["auction"] = "auction"
    budget: int = 100  # 预算金币
    items: list[Option]  # id/text/scores


Question = Annotated[
    ScaleQuestion | DilemmaQuestion | AllocationQuestion | SortQuestion | IATQuestion
    | SliderQuestion | ForcedChoiceQuestion | MatrixQuestion | AuctionQuestion,
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
