/**
 * Galgame 资历测评 —— 元数据 + 算分。
 *
 * 与三面镜(名人/价值/意识)的差异:
 * - 三面镜走复杂的 computeResult 引擎(维度/匹配/冲突/行为洞察)
 * - Galgame 是趣味向单选计分,简单累加 + 阈值映射称号
 * - 主题为霓虹赛博,与宣纸水墨的常规镜完全不同
 *
 * 因此 Galgame 不复用 Take.tsx / Report.tsx / assessments 元数据,
 * 而是有独立的 TakeGalgame / GalgameReport 页面与独立路由。
 */
import { GALGAME_QUESTIONS, type GalgameQuestion, type GalgameDim } from './questions'
import { GALGAME_TITLES, type GalgameTitle } from './titles'

export interface GalgameMeta {
  type: 'galgame'
  title: string
  description: string
  estimated_minutes: number
  question_count: number
  /** 板块归属,用于 SectionDetail 主题切换 */
  section: 'entertainment'
}

export const galgameMeta: GalgameMeta = {
  type: 'galgame',
  title: 'Galgame 能力测评',
  description: '50 道题,测出你是萌新、小资历还是老司机。从阅历量到梗文化,五维量化你的 Galgame 玩家底色。',
  estimated_minutes: 8,
  question_count: GALGAME_QUESTIONS.length,
  section: 'entertainment',
}

/** 维度顺序(用于分组展示) */
export const GALGAME_DIM_ORDER: GalgameDim[] = ['experience', 'genre', 'aesthetic', 'narrative', 'meme']

/** 维度代号 → 中文/英文/日文名 */
export const GALGAME_DIM_LABEL: Record<GalgameDim, { zh: string; en: string; ja: string }> = {
  experience: { zh: '阅历量', en: 'Experience', ja: '閲歴量' },
  genre: { zh: '类型偏好', en: 'Genre', ja: 'ジャンル' },
  aesthetic: { zh: '审美', en: 'Aesthetic', ja: '審美' },
  narrative: { zh: '剧情理解', en: 'Narrative', ja: '物語理解' },
  meme: { zh: '梗文化', en: 'Meme', ja: 'ミーム' },
}

export interface GalgameAnswer {
  question_id: string
  option_id: string
  score: number
  dim: GalgameDim
}

export interface GalgameDimStat {
  dim: GalgameDim
  got: number
  max: number
  pct: number
}

export interface GalgameResult {
  total: number
  max_total: number
  pct: number
  title: GalgameTitle
  dim_stats: GalgameDimStat[]
  answers: GalgameAnswer[]
}

/** 根据作答计算结果 */
export function computeGalgameResult(answers: GalgameAnswer[]): GalgameResult {
  const total = answers.reduce((s, a) => s + a.score, 0)
  const max_total = GALGAME_QUESTIONS.length * 6

  const dim_stats: GalgameDimStat[] = GALGAME_DIM_ORDER.map((dim) => {
    const qs = GALGAME_QUESTIONS.filter((q) => q.dim === dim)
    const max = qs.length * 6
    const got = answers.filter((a) => a.dim === dim).reduce((s, a) => s + a.score, 0)
    return { dim, got, max, pct: max > 0 ? Math.round((got / max) * 100) : 0 }
  })

  const title =
    GALGAME_TITLES.find((t) => total >= t.min_score && total <= t.max_score) ||
    GALGAME_TITLES[GALGAME_TITLES.length - 1]

  return {
    total,
    max_total,
    pct: Math.round((total / max_total) * 100),
    title,
    dim_stats,
    answers,
  }
}

export type { GalgameQuestion, GalgameDim, GalgameTitle }
export { GALGAME_QUESTIONS, GALGAME_TITLES }
