/**
 * 心镜数据契约 —— 与原项目 static/data/*.json 字段名 1:1 对齐。
 * 题库 YAML 源(data/*.yaml)经 build_bank.py 转为 src/data/*.ts,字段不变。
 */

// ===================== 题型枚举 =====================
export type QuestionType =
  | 'scale'        // 量表(选点得分)
  | 'dilemma'      // 两难困境(选项得分,可限时,可标记 courage/avoidance)
  | 'allocation'   // 资源分配(百分比,配平)
  | 'sort'         // 排序(位置权重递减)
  | 'iat'          // 内隐联想(反应时记录)
  | 'slider'       // 滑块(位置→low/high 插值)
  | 'forced_choice'// 强制二选一(权重 1.5x)
  | 'matrix'       // 矩阵(多陈述各自打分,中点归一)
  | 'auction'      // 拍卖(预算分配)

export type AssessmentType = 'celebrity' | 'value' | 'ideology'
export type AssessmentVersion = 'fast' | 'standard' | 'deep'

// ===================== 分数映射 =====================
/** dimension_key → 分值 */
export type ScoreMap = Record<string, number>

// ===================== 题目结构(9 题型联合) =====================
interface BaseQuestion {
  id: string
  type: QuestionType
  prompt: string
  dimensions: string[]
  tier: 1 | 2 | 3
  time_limit_sec?: number
  historical_figure?: string
  // 原 YAML 数据含历史遗留字段(如 historical_choice),用 index signature 容纳
  [k: string]: unknown
}

export interface ScalePoint { id: string; text: string; scores: ScoreMap
  [k: string]: unknown }
export interface ScaleQuestion extends BaseQuestion {
  type: 'scale'
  points: ScalePoint[]
}

/**
 * dilemma 选项。原 YAML 数据里 tag 实际有 courage/avoidance/pragmatic 三种;
 * 此外数据里还混入了一些中文 key(如"承受代价""守盟约",疑似历史遗留的别名标记),
 * 故用 index signature 容纳,避免类型检查阻断构建。
 */
export interface DilemmaOption {
  id: string
  text: string
  scores: ScoreMap
  tag?: 'courage' | 'avoidance' | 'pragmatic' | null
  [k: string]: unknown
}
export interface DilemmaQuestion extends BaseQuestion {
  type: 'dilemma'
  scenario: string
  options: DilemmaOption[]
}

export interface AllocationTarget { id: string; text: string; scores: ScoreMap
  [k: string]: unknown }
export interface AllocationQuestion extends BaseQuestion {
  type: 'allocation'
  targets: AllocationTarget[]
  total: number
}

export interface SortItem { id: string; text: string; scores: ScoreMap
  [k: string]: unknown }
export interface SortQuestion extends BaseQuestion {
  type: 'sort'
  items: SortItem[]
}

export interface IATWord { word: string; category: string
  [k: string]: unknown }
export interface IATQuestion extends BaseQuestion {
  type: 'iat'
  left_label: string
  right_label: string
  words: IATWord[]
}

export interface SliderBounds { low: number; high: number }
export interface SliderQuestion extends BaseQuestion {
  type: 'slider'
  left_label: string
  right_label: string
  scores: Record<string, SliderBounds>
}

export interface ForcedChoiceSide { id: string; text: string; scores: ScoreMap
  [k: string]: unknown }
export interface ForcedChoiceQuestion extends BaseQuestion {
  type: 'forced_choice'
  sides: ForcedChoiceSide[]
}

export interface MatrixStatement { id: string; text: string; scores: ScoreMap
  [k: string]: unknown }
export interface MatrixQuestion extends BaseQuestion {
  type: 'matrix'
  scale_max: number
  statements: MatrixStatement[]
}

export interface AuctionItem { id: string; text: string; scores: ScoreMap
  [k: string]: unknown }
export interface AuctionQuestion extends BaseQuestion {
  type: 'auction'
  budget: number
  items: AuctionItem[]
}

export type Question =
  | ScaleQuestion | DilemmaQuestion | AllocationQuestion | SortQuestion
  | IATQuestion | SliderQuestion | ForcedChoiceQuestion | MatrixQuestion | AuctionQuestion

// ===================== 题库 =====================
export interface QuestionBank {
  assessment_type: AssessmentType
  display_order: number
  title: string
  description: string
  estimated_minutes: number
  dimensions: string[]
  questions: Question[]
}

// ===================== 作答结构 =====================
export interface IATReaction { word: string; category: string; response: 'left' | 'right'; rt: number; correct: boolean }

export interface Answer {
  option_id?: string        // scale / dilemma
  position?: number         // slider (0-100)
  choice?: string           // forced_choice
  ratings?: Record<string, number>  // matrix {stmt_id: 1..scale_max}
  bids?: Record<string, number>     // auction {item_id: bid}
  allocation?: Record<string, number> // allocation {target_id: pct}
  order?: string[]          // sort [item_id,...] 按用户排序
  iat?: IATReaction[]       // iat
}

export interface AnswerRecord {
  question_id: string
  answer: Answer
  duration_ms: number
  change_count: number
  trajectory?: unknown[]    // 答题轨迹(可选,供行为分析扩展)
}

// ===================== 名人 / 意识形态 =====================
export interface Celebrity {
  id: string
  name: string
  image: string             // svg 路径
  photo: string             // jpg 路径
  blurb: string
  dims: ScoreMap            // 7 维分数 0-100
  quote: string
  era: string
  role: string
  tags: string[]
  intro: string
  anecdote: string
}

export interface Ideology {
  id: string
  image: string
  name: string
  blurb: string
  sensitive?: boolean
  theory: string
  coords: ScoreMap          // 8 轴坐标 0-100
}

// ===================== 测评元数据 =====================
export interface AssessmentMeta {
  type: AssessmentType
  title: string
  description: string
  estimated_minutes: number
  question_count: number
  display_order: number
}

// ===================== 算分结果 =====================
export interface Match {
  id: string
  name: string
  match_pct: number
  blurb: string
  quote?: string
  image?: string
  photo?: string
  tier?: string
  confidence?: '高' | '中' | '低' | null
}

export interface Conflict {
  question_id: string
  description: string
  conflict_type: 'dimension_contradiction' | 'iat_implicit_explicit' | 'iat_hesitation' | 'high_hesitation' | 'frequent_change' | 'timeout_instinct'
  severity: number
}

export interface Insight {
  code: string
  label: string
  desc: string
  [key: string]: unknown
}

export interface Insights {
  decision_style: Insight
  time_pressure_effect: Insight
  consistency: Insight
  iat_bias: Insight
  courage_index: Insight
  ambivalence: Insight
}

export interface ComputeResult {
  dimensions: ScoreMap
  matches: Match[]
  conflicts: Conflict[]
  insights: Insights
  percentiles: ScoreMap
  summary: string
  profile: { tags: string[] }
}
