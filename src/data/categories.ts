/**
 * 板块目录 —— 心镜的顶层组织单元。
 * 每个板块(category)是一组同类测评的集合,拥有独立视觉主题。
 * 新增板块只需在此追加一项,无需改路由逻辑(路由按 type 动态匹配)。
 *
 * 设计:板块是"入口聚合层",测评是"可执行单元"。
 * - 自我探索:三面镜(名人/价值/意识),宣纸水墨主题
 * - 娱乐:Galgame 资历测评等,霓虹赛博主题(预留,尚未实现)
 * - 未来更多板块在此扩展
 */
export interface CategoryMeta {
  id: string
  title: string
  subtitle: string
  /** 板块主题 CSS 标识,对应 [data-section="xxx"] 主题切换 */
  theme: string
  /** 板块图标(SVG 文件名,位于 /images/sections/) */
  icon: string
  /** 板块色调提示,用于卡片描边/角标 */
  accent: string
  /** 该板块下的测评 type 列表(对应 assessments.ts 的 type) */
  assessments: string[]
  /** 是否已上线(未上线的显示"敬请期待",不可点击) */
  available: boolean
  /** 板块描述,展示在入口卡上 */
  desc: string
  /** 板块标语,艺术字呈现 */
  tagline: string
}

export const categories: CategoryMeta[] = [
  {
    id: 'self',
    title: '自我探索',
    subtitle: 'Self Discovery',
    theme: 'self',
    icon: 'self',
    accent: 'var(--mirror-celebrity)',
    assessments: ['celebrity', 'value', 'ideology'],
    available: true,
    tagline: '三面镜子,照见真我',
    desc: '通过名人、价值、意识三面镜子,以情境化答题与行为轨迹,看见你在历史长河与价值坐标中的真实投影。',
  },
  {
    id: 'entertainment',
    title: '娱乐趣味',
    subtitle: 'Entertainment',
    theme: 'entertainment',
    icon: 'entertainment',
    accent: '#b8408b',
    assessments: ['galgame', 'galgame-char'],
    available: true,
    tagline: '玩心所向,资历自见',
    desc: 'Galgame 资历测评等趣味向测试,从玩家阅历到梗文化,测出你是萌新、小资历还是老司机。霓虹赛博主题,与自我探索板块形成鲜明对比。',
  },
  {
    id: 'relation',
    title: '关系镜像',
    subtitle: 'Relations',
    theme: 'relation',
    icon: 'relation',
    accent: '#4a8b6b',
    assessments: [],
    available: false,
    tagline: '你我之间,镜映彼此',
    desc: '友情、爱情、职场关系的镜像测评,测出你在关系中的真实模式。即将推出。',
  },
]

/** 根据 assessment type 反查所属板块 */
export function findCategoryByAssessment(type: string): CategoryMeta | undefined {
  return categories.find((c) => c.assessments.includes(type))
}
