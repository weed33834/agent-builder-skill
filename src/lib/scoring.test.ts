/**
 * scoring.ts 单元测试 —— 对照原项目 scoring.js 的输出验证 TS 移植正确性。
 *
 * 策略:用原 static/data/*.json 作 golden data,构造固定答案输入,
 * 分别跑 TS 版 computeResult 和原 JS 版(通过动态加载原文件),
 * 对比 dimensions/matches/insights 等字段级一致。
 *
 * 由于原 JS 版挂 window.MM.scoring,这里用 jsdom 环境。但为简化,
 * 这里只测 TS 版的纯函数正确性(确定性输入→确定性输出快照),
 * 跨版本对照留给阶段 1 的 Playwright 回归。
 */
import { describe, it, expect } from 'vitest'
import {
  filterBank, scoreAnswers, matchCelebrity, matchValue, matchIdeology,
  detectConflicts, deriveInsights, estimatePercentiles, buildSummary, computeResult,
} from './scoring'
import type {
  AnswerRecord, Celebrity, Ideology, QuestionBank, ScoreMap,
} from './types'

// ===================== 测试夹具 =====================
// 构造一个最小题库覆盖各题型,验证算分路径
const fixtureBank: QuestionBank = {
  assessment_type: 'celebrity',
  display_order: 1,
  title: '测试名人镜',
  description: '测试用',
  estimated_minutes: 5,
  dimensions: ['openness', 'conscientiousness'],
  questions: [
    {
      id: 'q1', type: 'scale', prompt: '量表题', dimensions: ['openness'], tier: 1,
      points: [
        { id: 'a', text: '是', scores: { openness: 5 } },
        { id: 'b', text: '否', scores: { openness: 0 } },
      ],
    },
    {
      id: 'q2', type: 'dilemma', prompt: '两难题', dimensions: ['conscientiousness'], tier: 1,
      scenario: '场景',
      options: [
        { id: 'x', text: '选项A', scores: { conscientiousness: 5 }, tag: 'courage' },
        { id: 'y', text: '选项B', scores: { conscientiousness: 0 }, tag: 'avoidance' },
      ],
    },
  ],
}

const fixtureCelebrities: Celebrity[] = [
  { id: 'c1', name: '人物A', image: '', photo: '', blurb: '简介', dims: { openness: 80, conscientiousness: 60 }, quote: '', era: '', role: '', tags: [], intro: '', anecdote: '' },
  { id: 'c2', name: '人物B', image: '', photo: '', blurb: '简介', dims: { openness: 30, conscientiousness: 20 }, quote: '', era: '', role: '', tags: [], intro: '', anecdote: '' },
]

const fixtureIdeologies: Ideology[] = [
  { id: 'i1', image: '', name: '意识形态A', blurb: '', theory: '', coords: { econ_left: 70, econ_right: 30, authority: 60, liberty: 40, progress: 65, tradition: 35, globalist: 60, nationalist: 40 } },
  { id: 'i2', image: '', name: '意识形态B', blurb: '', theory: '', coords: { econ_left: 30, econ_right: 70, authority: 40, liberty: 60, progress: 35, tradition: 65, globalist: 40, nationalist: 60 } },
]

describe('filterBank', () => {
  it('fast 版本只保留 tier<=1', () => {
    const bank: QuestionBank = {
      ...fixtureBank,
      estimated_minutes: 10,
      questions: [
        { ...fixtureBank.questions[0], tier: 1 },
        { ...fixtureBank.questions[0], id: 'q1b', tier: 2 },
        { ...fixtureBank.questions[0], id: 'q1c', tier: 3 },
      ],
    }
    const filtered = filterBank(bank, 'fast')
    expect(filtered.questions).toHaveLength(1)
    expect(filtered.estimated_minutes).toBe(3) // 10 * 1/3 ≈ 3.3 → round 3
  })

  it('standard 版本保留 tier<=2', () => {
    const bank: QuestionBank = {
      ...fixtureBank,
      estimated_minutes: 10,
      questions: [
        { ...fixtureBank.questions[0], tier: 1 },
        { ...fixtureBank.questions[0], id: 'q1b', tier: 2 },
        { ...fixtureBank.questions[0], id: 'q1c', tier: 3 },
      ],
    }
    const filtered = filterBank(bank, 'standard')
    expect(filtered.questions).toHaveLength(2)
  })

  it('deep 版本保留全部', () => {
    const filtered = filterBank(fixtureBank, 'deep')
    expect(filtered.questions).toHaveLength(fixtureBank.questions.length)
  })

  it('不改变原 bank(返回新对象或原引用)', () => {
    const original = fixtureBank.questions.length
    filterBank(fixtureBank, 'fast')
    expect(fixtureBank.questions).toHaveLength(original)
  })
})

describe('scoreAnswers', () => {
  it('全选高分选项→维度归一化到 100', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 1000, change_count: 0 },
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 1000, change_count: 0 },
    ]
    const dims = scoreAnswers('celebrity', answers, 'standard', fixtureBank)
    expect(dims.openness).toBe(100)
    expect(dims.conscientiousness).toBe(100)
  })

  it('全选低分选项→维度归一化到 0', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'b' }, duration_ms: 1000, change_count: 0 },
      { question_id: 'q2', answer: { option_id: 'y' }, duration_ms: 1000, change_count: 0 },
    ]
    const dims = scoreAnswers('celebrity', answers, 'standard', fixtureBank)
    expect(dims.openness).toBe(0)
    expect(dims.conscientiousness).toBe(0)
  })

  it('未知 question_id 被跳过不报错', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'nonexistent', answer: { option_id: 'a' }, duration_ms: 1000, change_count: 0 },
    ]
    const dims = scoreAnswers('celebrity', answers, 'standard', fixtureBank)
    // 无有效作答,raw=0;bounds 来自 q1 scale [0,5],归一化 0/(5-0)*100=0
    expect(dims.openness).toBe(0)
    expect(dims.conscientiousness).toBe(0)
  })
})

describe('matchCelebrity', () => {
  it('返回 top3,按 match_pct 降序', () => {
    const dims: ScoreMap = { openness: 80, conscientiousness: 60 }
    const matches = matchCelebrity(dims, fixtureCelebrities)
    expect(matches).toHaveLength(2)
    expect(matches[0].name).toBe('人物A') // 距离更近
    expect(matches[0].match_pct).toBeGreaterThanOrEqual(matches[1].match_pct)
  })

  it('空名人库返回空数组', () => {
    expect(matchCelebrity({}, [])).toEqual([])
  })
})

describe('matchValue', () => {
  it('高分道德维度→理想型 tier', () => {
    const dims: ScoreMap = { honesty: 90, altruism: 90, justice: 90, duty: 90, empathy: 90, discipline: 90 }
    const matches = matchValue(dims)
    expect(matches[0].name).toContain('理想型')
    expect(matches[0].match_pct).toBeCloseTo(90, 1)
  })

  it('低分道德维度→失序型 tier', () => {
    const dims: ScoreMap = { honesty: 20, altruism: 20, justice: 20, duty: 20, empathy: 20, discipline: 20 }
    const matches = matchValue(dims)
    expect(matches[0].name).toContain('失序型')
  })
})

describe('matchIdeology', () => {
  it('返回带 tier 和 confidence 的匹配', () => {
    const dims: ScoreMap = { econ_left: 70, econ_right: 30, authority: 60, liberty: 40, progress: 65, tradition: 35, globalist: 60, nationalist: 40 }
    const matches = matchIdeology(dims, fixtureIdeologies)
    expect(matches).toHaveLength(2)
    expect(matches[0]).toHaveProperty('tier')
    expect(matches[0]).toHaveProperty('confidence')
    expect(['高', '中', '低']).toContain(matches[0].confidence)
  })

  it('空意识形态库返回空数组', () => {
    expect(matchIdeology({}, [])).toEqual([])
  })
})

describe('detectConflicts', () => {
  it('多次改主意→frequent_change 冲突', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 1000, change_count: 4 },
    ]
    const conflicts = detectConflicts('celebrity', answers, {}, fixtureBank)
    expect(conflicts.some(c => c.conflict_type === 'frequent_change')).toBe(true)
  })

  it('超长犹豫→high_hesitation 冲突', () => {
    // median([1000, 1000, 60000]) = 1000; 60000 > 1000*2.5=2500 → 触发
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 1000, change_count: 0 },
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 1000, change_count: 0 },
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 60000, change_count: 0 }, // 60x 中位数
    ]
    const conflicts = detectConflicts('celebrity', answers, {}, fixtureBank)
    expect(conflicts.some(c => c.conflict_type === 'high_hesitation')).toBe(true)
  })

  it('最多返回 5 条', () => {
    const answers: AnswerRecord[] = Array.from({ length: 10 }, () => ({
      question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 30000, change_count: 4,
    }))
    const conflicts = detectConflicts('celebrity', answers, {}, fixtureBank)
    expect(conflicts.length).toBeLessThanOrEqual(5)
  })
})

describe('deriveInsights', () => {
  it('快速作答→直觉型', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 1500, change_count: 0 },
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 1500, change_count: 0 },
    ]
    const insights = deriveInsights('celebrity', answers, {}, fixtureBank)
    expect(insights.decision_style.code).toBe('intuitive')
    expect(insights.decision_style.label).toBe('直觉型')
  })

  it('慢速作答→深思型', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 10000, change_count: 0 },
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 10000, change_count: 0 },
    ]
    const insights = deriveInsights('celebrity', answers, {}, fixtureBank)
    expect(insights.decision_style.code).toBe('deliberate')
  })

  it('courage 标签统计正确', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 1000, change_count: 0 }, // courage
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 1000, change_count: 0 }, // courage
    ]
    const insights = deriveInsights('celebrity', answers, {}, fixtureBank)
    expect(insights.courage_index.code).toBe('high') // 100% ≥ 70
  })
})

describe('estimatePercentiles', () => {
  it('celebrity openness 在均值 60 处→百分位约 50', () => {
    const pct = estimatePercentiles('celebrity', { openness: 60 })
    expect(pct.openness).toBeGreaterThan(45)
    expect(pct.openness).toBeLessThan(55)
  })

  it('未知维度→默认 50', () => {
    const pct = estimatePercentiles('celebrity', { unknown_dim: 80 } as ScoreMap)
    expect(pct.unknown_dim).toBe(50)
  })

  it('结果在 [1, 99] 范围内', () => {
    const pct = estimatePercentiles('celebrity', { openness: 200 } as ScoreMap)
    expect(pct.openness).toBeLessThanOrEqual(99)
    expect(pct.openness).toBeGreaterThanOrEqual(1)
  })
})

describe('buildSummary', () => {
  it('celebrity 有匹配→提及名人名', () => {
    const summary = buildSummary('celebrity', { openness: 80 }, [
      { id: 'c1', name: '人物A', match_pct: 90, blurb: '简介' },
    ])
    expect(summary).toContain('人物A')
    expect(summary).toContain('简介')
  })

  it('无匹配→特殊文案', () => {
    const summary = buildSummary('celebrity', {}, [])
    expect(summary).toContain('太特殊')
  })
})

describe('computeResult 端到端', () => {
  it('全流程返回完整结果对象', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 2000, change_count: 0 },
      { question_id: 'q2', answer: { option_id: 'x' }, duration_ms: 2000, change_count: 0 },
    ]
    const result = computeResult(
      'celebrity', 'standard', answers,
      fixtureBank, fixtureCelebrities, fixtureIdeologies,
    )
    // 结构完整
    expect(result).toHaveProperty('dimensions')
    expect(result).toHaveProperty('matches')
    expect(result).toHaveProperty('conflicts')
    expect(result).toHaveProperty('insights')
    expect(result).toHaveProperty('percentiles')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('profile')
    // profile.tags 是数组
    expect(Array.isArray(result.profile.tags)).toBe(true)
    // dimensions 含测试维度
    expect(result.dimensions).toHaveProperty('openness')
    expect(result.dimensions).toHaveProperty('conscientiousness')
  })

  it('不同 version 产出可不同(fast 题少)', () => {
    const answers: AnswerRecord[] = [
      { question_id: 'q1', answer: { option_id: 'a' }, duration_ms: 2000, change_count: 0 },
    ]
    // fast 只保留 tier1,两题都是 tier1,仍能算
    const result = computeResult(
      'celebrity', 'fast', answers,
      fixtureBank, fixtureCelebrities, fixtureIdeologies,
    )
    expect(result.dimensions.openness).toBe(100)
  })
})
