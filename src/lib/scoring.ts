/**
 * 心镜算分引擎(TS 版) —— 1:1 移植自原项目 static/scoring.js
 * 原 JS 版本身是 1:1 翻译自 Python app/services/*.py,所有阈值/权重/归一化边界严格一致。
 * 本文件保持纯函数,无 DOM 依赖,便于单测对照原 JSON 产物。
 *
 * 与原版唯一差异:数据加载改为接收已 import 的 TS 模块(loadBank/loadCelebrities/loadIdeologies
 * 由调用方传入),不再裸 fetch —— 适配"数据转 TS import"的架构决策。
 */
import type {
  AnswerRecord, AssessmentType, AssessmentVersion, Celebrity, ComputeResult,
  Conflict, Ideology, Insight, Insights, Match, Question, QuestionBank, ScoreMap,
} from './types'
import { strEq, truncate } from './utils'

// ===================== 工具 =====================
function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// 标准误差函数(Abramowitz & Stegun 7.1.26 近似,误差 < 1.5e-7)
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}

function normalCdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / (sigma * Math.SQRT2)
  return 0.5 * (1 + erf(z))
}

// ===================== 题库过滤 =====================
// 版本→tier 上限(与 Python filter_bank 一致)
const TIERS: Record<AssessmentVersion, number> = { fast: 1, standard: 2, deep: 3 }

export function filterBank(bank: QuestionBank, version: AssessmentVersion): QuestionBank {
  const maxTier = TIERS[version] ?? 2
  const filtered = bank.questions.filter(q => (q.tier || 3) <= maxTier)
  if (filtered.length === bank.questions.length) return bank
  const ratio = filtered.length / Math.max(1, bank.questions.length)
  const newMinutes = Math.max(2, Math.round(bank.estimated_minutes * ratio))
  return { ...bank, questions: filtered, estimated_minutes: newMinutes }
}

// ===================== scoring.py =====================
function _accumulate(q: Question, answer: AnswerRecord['answer'], raw: ScoreMap): void {
  switch (q.type) {
    case 'scale':
      if (answer.option_id != null) {
        for (const p of q.points) {
          if (strEq(p.id, answer.option_id)) {
            for (const [k, v] of Object.entries(p.scores || {})) raw[k] = (raw[k] || 0) + v
          }
        }
      }
      break
    case 'dilemma':
      if (answer.option_id != null) {
        for (const opt of q.options) {
          if (strEq(opt.id, answer.option_id)) {
            for (const [k, v] of Object.entries(opt.scores || {})) raw[k] = (raw[k] || 0) + v
          }
        }
      }
      break
    case 'allocation': {
      const alloc = answer.allocation || {}
      for (const tgt of q.targets) {
        const pct = (alloc[tgt.id] || 0) / 100.0
        for (const [k, v] of Object.entries(tgt.scores || {})) raw[k] = (raw[k] || 0) + v * pct * 2
      }
      break
    }
    case 'slider':
      if (answer.position != null) {
        const pos = Math.max(0, Math.min(100, parseFloat(String(answer.position)))) / 100.0
        for (const [dim, bounds] of Object.entries(q.scores)) {
          const low = bounds.low != null ? bounds.low : 0
          const high = bounds.high != null ? bounds.high : 0
          raw[dim] = (raw[dim] || 0) + (low + (high - low) * pos)
        }
      }
      break
    case 'forced_choice':
      if (answer.choice != null) {
        for (const side of q.sides) {
          if (strEq(side.id, answer.choice)) {
            for (const [k, v] of Object.entries(side.scores || {})) raw[k] = (raw[k] || 0) + v * 1.5
          }
        }
      }
      break
    case 'matrix': {
      const ratings = answer.ratings
      if (ratings != null) {
        const smax = Math.max(4, q.scale_max || 7)
        for (const stmt of q.statements) {
          const r = ratings[stmt.id]
          if (r == null) continue
          const mid = (smax + 1) / 2
          const norm = (r - mid) / ((smax - 1) / 2)
          for (const [dim, factor] of Object.entries(stmt.scores || {})) raw[dim] = (raw[dim] || 0) + norm * factor
        }
      }
      break
    }
    case 'auction': {
      const budget = q.budget
      const bids = answer.bids || {}
      for (const item of q.items) {
        const bid = bids[item.id] || 0
        const ratio = Math.max(0, Math.min(parseFloat(String(bid)), parseFloat(String(budget)))) / budget
        for (const [k, v] of Object.entries(item.scores || {})) raw[k] = (raw[k] || 0) + v * ratio * 2
      }
      break
    }
    // sort 在 _scoreAnswers 单独处理(位置权重)
    case 'sort':
    case 'iat':
      break
  }
}

function _computeDimBounds(bank: QuestionBank): Record<string, [number, number]> {
  const mins: ScoreMap = {}
  const maxs: ScoreMap = {}

  for (const q of bank.questions) {
    const contribs: Record<string, number[]> = {}

    switch (q.type) {
      case 'scale': {
        const scaleDims = new Set<string>()
        for (const p of q.points) for (const k of Object.keys(p.scores || {})) scaleDims.add(k)
        for (const dim of scaleDims) {
          contribs[dim] = contribs[dim] || []
          contribs[dim].push(0.0)
          for (const p of q.points) if (p.scores && p.scores[dim] != null) contribs[dim].push(p.scores[dim] * 1.0)
        }
        break
      }
      case 'dilemma': {
        const dDims = new Set<string>()
        for (const opt of q.options) for (const k of Object.keys(opt.scores || {})) dDims.add(k)
        for (const dim of dDims) {
          contribs[dim] = contribs[dim] || []
          contribs[dim].push(0.0)
          for (const opt of q.options) if (opt.scores && opt.scores[dim] != null) contribs[dim].push(opt.scores[dim] * 1.0)
        }
        break
      }
      case 'allocation': {
        const aDims = new Set<string>()
        for (const tgt of q.targets) for (const k of Object.keys(tgt.scores || {})) aDims.add(k)
        for (const dim of aDims) {
          contribs[dim] = contribs[dim] || []
          const vals = q.targets.map(tgt => (tgt.scores[dim] || 0) * 2.0)
          contribs[dim].push(Math.min(...vals), Math.max(...vals))
        }
        break
      }
      case 'slider': {
        for (const [dim, bounds] of Object.entries(q.scores)) {
          contribs[dim] = contribs[dim] || []
          contribs[dim].push(bounds.low != null ? bounds.low : 0, bounds.high != null ? bounds.high : 0)
        }
        break
      }
      case 'forced_choice': {
        const fcDims = new Set<string>()
        for (const side of q.sides) for (const k of Object.keys(side.scores || {})) fcDims.add(k)
        for (const dim of fcDims) {
          contribs[dim] = contribs[dim] || []
          contribs[dim].push(0.0)
          for (const side of q.sides) if (side.scores && side.scores[dim] != null) contribs[dim].push(side.scores[dim] * 1.5)
        }
        break
      }
      case 'matrix': {
        for (const stmt of q.statements) for (const [dim, factor] of Object.entries(stmt.scores || {})) {
          contribs[dim] = contribs[dim] || []
          contribs[dim].push(-factor, factor)
        }
        break
      }
      case 'auction': {
        for (const item of q.items) for (const [dim, v] of Object.entries(item.scores || {})) {
          contribs[dim] = contribs[dim] || []
          contribs[dim].push(0.0, v * 2.0)
        }
        break
      }
      case 'sort': {
        const items = q.items
        const n = items.length
        const weights = Array.from({ length: n }, (_, i) => (1.0 - i * 0.15) * 2.0)
        const allSortDims = new Set<string>()
        for (const item of items) for (const k of Object.keys(item.scores || {})) allSortDims.add(k)
        for (const dim of allSortDims) {
          contribs[dim] = contribs[dim] || []
          const scores = items.map(item => item.scores[dim] || 0)
          const sSorted = [...scores].sort((a, b) => b - a)
          const wSorted = [...weights].sort((a, b) => b - a)
          const mx = sSorted.reduce((acc, s, i) => acc + s * wSorted[i], 0)
          const mn = [...scores].sort((a, b) => a - b).reduce((acc, s, i) => acc + s * wSorted[i], 0)
          contribs[dim].push(mn, mx)
        }
        break
      }
      case 'iat':
        break
    }

    for (const [dim, vals] of Object.entries(contribs)) {
      if (vals.length) {
        mins[dim] = (mins[dim] || 0) + Math.min(...vals)
        maxs[dim] = (maxs[dim] || 0) + Math.max(...vals)
      }
    }
  }

  const out: Record<string, [number, number]> = {}
  const allDims = bank.dimensions || []
  for (const d of allDims) {
    const lo = mins[d] || 0
    const hi = maxs[d] || 0
    out[d] = (lo === hi) ? [0.0, 0.0] : [lo, hi]
  }
  return out
}

function _normalize(rawScore: number, bounds: [number, number]): number {
  const [lo, hi] = bounds
  if (hi <= lo) return 50.0
  const score = (rawScore - lo) / (hi - lo) * 100.0
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10
}

export function scoreAnswers(
  _type: AssessmentType,
  answers: AnswerRecord[],
  _version: AssessmentVersion,
  bank: QuestionBank,
): ScoreMap {
  const fullBank = bank // 已按 version 过滤
  const raw: ScoreMap = {}
  const qById: Record<string, Question> = {}
  for (const q of fullBank.questions) qById[q.id] = q

  for (const ans of answers) {
    const q = qById[ans.question_id]
    if (!q) continue
    _accumulate(q, ans.answer, raw)
  }

  // 排序题:位置越靠前权重越大,递减系数 0.15
  for (const ans of answers) {
    const q = qById[ans.question_id]
    if (q && q.type === 'sort' && ans.answer && ans.answer.order) {
      for (let idx = 0; idx < ans.answer.order.length; idx++) {
        const itemId = ans.answer.order[idx]
        const weight = (1.0 - idx * 0.15) * 2.0
        const item = q.items.find(i => strEq(i.id, itemId))
        if (item) for (const [dim, v] of Object.entries(item.scores || {})) raw[dim] = (raw[dim] || 0) + v * weight
      }
    }
  }

  const dimBounds = _computeDimBounds(fullBank)
  const dims = fullBank.dimensions || []
  const result: ScoreMap = {}
  for (const d of dims) result[d] = _normalize(raw[d] || 0, dimBounds[d])
  return result
}

// ===================== matchers.py =====================
const IDEO_AXES = ['econ_left', 'econ_right', 'authority', 'liberty', 'progress', 'tradition', 'globalist', 'nationalist']

function _matchPctByDistance(user: ScoreMap, ref: ScoreMap): number {
  const keys = Object.keys(user).filter(k => ref[k] != null)
  if (!keys.length) return 0.0
  let dist = 0
  for (const k of keys) dist += (user[k] - ref[k]) ** 2
  dist = Math.sqrt(dist)
  const maxTheory = Math.sqrt(keys.length) * 100.0
  const sim = Math.max(0, 1 - dist / maxTheory)
  return Math.round(sim * 1000) / 10
}

export function matchCelebrity(dimensions: ScoreMap, celebrities: Celebrity[]): Match[] {
  if (!celebrities || !celebrities.length) return []
  const scored = celebrities.map(c => ({ ...c, match_pct: _matchPctByDistance(dimensions, c.dims || {}) }))
  scored.sort((a, b) => b.match_pct - a.match_pct)
  return scored.slice(0, 3).map(c => ({
    id: c.id, name: c.name, match_pct: c.match_pct,
    blurb: c.blurb, quote: c.quote || '', image: c.image || '', photo: c.photo || '',
  }))
}

export function matchValue(dimensions: ScoreMap): Match[] {
  const moral = ['honesty', 'altruism', 'justice', 'duty', 'empathy', 'discipline']
    .reduce((acc, d) => acc + (dimensions[d] != null ? dimensions[d] : 50), 0) / 6
  let tier: string, blurb: string
  if (moral < 40) { tier = '失序型'; blurb = '价值优先级混乱,常因情境放弃原则' }
  else if (moral < 55) { tier = '务实型'; blurb = '理解道德准则,但实操会权衡得失' }
  else if (moral < 70) { tier = '守正型'; blurb = '多数情况守原则,关键时刻也稳得住' }
  else if (moral < 85) { tier = '端方型'; blurb = '道德准则清晰且稳定,少有例外' }
  else { tier = '理想型'; blurb = '原则高于一切,常愿为此付代价' }
  const dominant = Object.keys(dimensions).length
    ? Object.keys(dimensions).reduce((a, b) => (dimensions[a] >= dimensions[b] ? a : b))
    : 'unknown'
  const typeMap: Record<string, string> = {
    honesty: '诚实至上者', altruism: '利他主义者', justice: '公正守护者',
    duty: '责任承担者', empathy: '共情型', discipline: '自律型',
  }
  return [
    { id: 'moral_tier', name: '道德水平:' + tier, match_pct: Math.round(moral * 10) / 10, blurb },
    {
      id: 'value_type',
      name: '价值类型:' + (typeMap[dominant] || '多元'),
      match_pct: Math.round((dimensions[dominant] != null ? dimensions[dominant] : 50) * 10) / 10,
      blurb: '主导价值维度:' + dominant,
    },
  ]
}

function _ideoCorpusStats(ideologies: Ideology[]): [ScoreMap, ScoreMap] {
  if (!ideologies || !ideologies.length) return [{}, {}]
  const vecs = ideologies.map(c => IDEO_AXES.map(k => (c.coords && c.coords[k] != null ? c.coords[k] : 50)))
  const n = vecs.length
  const means: ScoreMap = {}
  const stds: ScoreMap = {}
  IDEO_AXES.forEach((k, i) => {
    const col = vecs.map(v => v[i])
    means[k] = col.reduce((a, b) => a + b, 0) / n
    const variance = col.reduce((a, b) => a + (b - means[k]) ** 2, 0) / n
    stds[k] = Math.sqrt(variance)
  })
  // means 在 _ensureIdeoWeights 中未直接使用,但保留返回值结构对称(与原版一致)
  void means
  return [means, stds]
}

function _ideoPairwisePercentiles(ideologies: Ideology[]): { p30: number; p60: number; p90: number } {
  if (!ideologies || ideologies.length < 2) return { p30: 40, p60: 55, p90: 75 }
  const sims: number[] = []
  for (let a = 0; a < ideologies.length; a++) {
    const va = IDEO_AXES.map(k => (ideologies[a].coords && ideologies[a].coords[k] != null ? ideologies[a].coords[k] : 50))
    for (let b = a + 1; b < ideologies.length; b++) {
      const vb = IDEO_AXES.map(k => (ideologies[b].coords && ideologies[b].coords[k] != null ? ideologies[b].coords[k] : 50))
      let d = 0
      for (let i = 0; i < IDEO_AXES.length; i++) d += (va[i] - vb[i]) ** 2
      d = Math.sqrt(d)
      const sim = Math.max(0, 1 - d / IDEO_MAX_WDIST) * 100
      sims.push(sim)
    }
  }
  sims.sort((a, b) => a - b)
  const pct = (p: number) => sims[Math.min(sims.length - 1, Math.floor(p * sims.length))]
  return { p30: pct(0.30), p60: pct(0.60), p90: pct(0.90) }
}

// 模块级权重(基于意识形态语料方差加权)
let IDEO_WEIGHTS: ScoreMap | null = null
let IDEO_MAX_WDIST = 1.0
let IDEO_TIER_PCT = { p30: 40, p60: 55, p90: 75 }

function _ensureIdeoWeights(ideologies: Ideology[]): void {
  if (IDEO_WEIGHTS) return
  const [, stds] = _ideoCorpusStats(ideologies)
  if (!stds || !Object.keys(stds).length) {
    IDEO_WEIGHTS = {}
    IDEO_AXES.forEach(k => (IDEO_WEIGHTS as ScoreMap)[k] = 1.0)
    return
  }
  const meanStd = IDEO_AXES.reduce((acc, k) => acc + (stds[k] || 0), 0) / IDEO_AXES.length
  IDEO_WEIGHTS = {}
  IDEO_AXES.forEach(k => {
    (IDEO_WEIGHTS as ScoreMap)[k] = meanStd ? (stds[k] || 0) / meanStd : 1.0
  })
  IDEO_MAX_WDIST = Math.sqrt(IDEO_AXES.reduce((acc, k) => acc + (IDEO_WEIGHTS as ScoreMap)[k] * (100 ** 2), 0)) || 1.0
  IDEO_TIER_PCT = _ideoPairwisePercentiles(ideologies)
}

function _tierOf(sim: number): string {
  if (sim >= IDEO_TIER_PCT.p90) return '强匹配'
  if (sim >= IDEO_TIER_PCT.p60) return '较接近'
  if (sim >= IDEO_TIER_PCT.p30) return '部分重合'
  return '仅参考'
}

export function matchIdeology(dimensions: ScoreMap, ideologies: Ideology[]): Match[] {
  _ensureIdeoWeights(ideologies)
  if (!ideologies || !ideologies.length) return []
  const userVec = IDEO_AXES.map(k => (dimensions[k] != null ? dimensions[k] : 50))
  const scored = ideologies.map(ideo => {
    const vec = IDEO_AXES.map(k => (ideo.coords && ideo.coords[k] != null ? ideo.coords[k] : 50))
    let wdist = 0
    for (let i = 0; i < IDEO_AXES.length; i++) wdist += (IDEO_WEIGHTS as ScoreMap)[IDEO_AXES[i]] * (userVec[i] - vec[i]) ** 2
    wdist = Math.sqrt(wdist)
    const sim = Math.max(0, 1 - wdist / IDEO_MAX_WDIST)
    return { ...ideo, _sim: Math.round(sim * 1000) / 10 }
  })
  scored.sort((a, b) => b._sim - a._sim)
  const sims = scored.map(s => s._sim)
  const margin = sims.length > 1 ? sims[0] - sims[1] : 100.0
  let userFromNeutral = 0
  for (const k of IDEO_AXES) userFromNeutral += (IDEO_WEIGHTS as ScoreMap)[k] * ((dimensions[k] != null ? dimensions[k] : 50) - 50) ** 2
  userFromNeutral = Math.sqrt(userFromNeutral)
  let confidence: '高' | '中' | '低'
  if (margin < 2.0) confidence = '低'
  else if (margin < 6.0) confidence = '中'
  else confidence = '高'
  if (userFromNeutral < 12.0) confidence = '低'
  return scored.slice(0, 3).map((i, rank) => ({
    id: i.id, name: i.name, match_pct: i._sim, blurb: i.blurb,
    tier: _tierOf(i._sim), confidence: rank === 0 ? confidence : null,
  }))
}

export function getMatcher(type: AssessmentType): (dimensions: ScoreMap, celebrities: Celebrity[], ideologies: Ideology[]) => Match[] {
  if (type === 'celebrity') return (d, c) => matchCelebrity(d, c)
  if (type === 'value') return (d) => matchValue(d)
  if (type === 'ideology') return (d, _c, ideo) => matchIdeology(d, ideo)
  throw new Error('不支持的测评类型: ' + type)
}

// ===================== conflicts.py =====================
function _collectDirections(q: Question, answer: AnswerRecord['answer'], dimDirections: Record<string, [string, number][]>): void {
  switch (q.type) {
    case 'scale':
      if (answer.option_id != null) {
        for (const p of q.points) if (strEq(p.id, answer.option_id)) for (const [k, v] of Object.entries(p.scores || {})) {
          (dimDirections[k] = dimDirections[k] || []).push([q.id, v])
        }
      }
      break
    case 'dilemma':
      if (answer.option_id != null) {
        for (const opt of q.options) if (strEq(opt.id, answer.option_id)) for (const [k, v] of Object.entries(opt.scores || {})) {
          (dimDirections[k] = dimDirections[k] || []).push([q.id, v])
        }
      }
      break
    case 'forced_choice':
      if (answer.choice != null) {
        for (const side of q.sides) if (strEq(side.id, answer.choice)) for (const [k, v] of Object.entries(side.scores || {})) {
          (dimDirections[k] = dimDirections[k] || []).push([q.id, v])
        }
      }
      break
    case 'slider':
      if (answer.position != null) {
        const pos = Math.max(0, Math.min(100, parseFloat(String(answer.position)))) / 100.0
        for (const [dim, bounds] of Object.entries(q.scores)) {
          const low = bounds.low != null ? bounds.low : 0
          const high = bounds.high != null ? bounds.high : 0
          const val = low + (high - low) * pos
          ;(dimDirections[dim] = dimDirections[dim] || []).push([q.id, val])
        }
      }
      break
    case 'matrix': {
      const ratings = answer.ratings
      if (ratings != null) {
        const smax = Math.max(4, q.scale_max || 7)
        for (const stmt of q.statements) {
          const r = ratings[stmt.id]
          if (r == null) continue
          const mid = (smax + 1) / 2, norm = (r - mid) / ((smax - 1) / 2)
          for (const [dim, factor] of Object.entries(stmt.scores || {})) {
            (dimDirections[dim] = dimDirections[dim] || []).push([q.id, norm * factor])
          }
        }
      }
      break
    }
    case 'auction': {
      const budget = q.budget
      const bids = answer.bids || {}
      for (const item of q.items) {
        const bid = bids[item.id] || 0, ratio = Math.max(0, bid) / budget
        for (const [dim, v] of Object.entries(item.scores || {})) {
          (dimDirections[dim] = dimDirections[dim] || []).push([q.id, v * ratio])
        }
      }
      break
    }
    case 'allocation': {
      const alloc = answer.allocation || {}
      for (const tgt of q.targets) {
        const pct = (alloc[tgt.id] || 0) / 100.0
        for (const [dim, v] of Object.entries(tgt.scores || {})) {
          (dimDirections[dim] = dimDirections[dim] || []).push([q.id, v * pct])
        }
      }
      break
    }
    case 'sort': {
      const order = answer.order || []
      for (let idx = 0; idx < order.length; idx++) {
        const weight = 1.0 - idx * 0.15
        const item = q.items.find(i => strEq(i.id, order[idx]))
        if (item) for (const [dim, v] of Object.entries(item.scores || {})) {
          (dimDirections[dim] = dimDirections[dim] || []).push([q.id, v * weight])
        }
      }
      break
    }
    case 'iat':
      break
  }
}

function _detectDimensionConflicts(
  dimDirections: Record<string, [string, number][]>,
  qById: Record<string, Question>,
): Conflict[] {
  const out: Conflict[] = []
  for (const [dim, items] of Object.entries(dimDirections)) {
    if (items.length < 2) continue
    const maxAbs = Math.max(...items.map(([, v]) => Math.abs(v)))
    if (maxAbs === 0) continue
    const threshold = maxAbs * 0.35
    const positives = items.filter(([, v]) => v > threshold)
    const negatives = items.filter(([, v]) => v < -threshold)
    if (positives.length && negatives.length) {
      const pos = positives.reduce((a, b) => (b[1] > a[1] ? b : a))
      const neg = negatives.reduce((a, b) => (b[1] < a[1] ? b : a))
      const q1 = qById[pos[0]], q2 = qById[neg[0]]
      if (q1 && q2) out.push({
        question_id: pos[0] + '+' + neg[0],
        description: `在「${dim}」维度上,你在不同题中给出方向相反的答案——「${truncate(q1.prompt, 16)}」与「${truncate(q2.prompt, 16)}」,反映内在未解的张力`,
        conflict_type: 'dimension_contradiction', severity: 3,
      })
    }
  }
  return out.slice(0, 2)
}

function _detectIatConflicts(answers: AnswerRecord[], qById: Record<string, Question>): Conflict[] {
  const out: Conflict[] = []
  type IATReactionList = NonNullable<AnswerRecord['answer']['iat']>
  const iatResults: [Question, IATReactionList][] = []
  for (const ans of answers) {
    const q = qById[ans.question_id]
    if (q && q.type === 'iat' && ans.answer && ans.answer.iat) {
      iatResults.push([q, ans.answer.iat as IATReactionList])
    }
  }
  if (!iatResults.length) return out
  for (const [q, reactions] of iatResults) {
    const errs = reactions.filter(r => !r.correct)
    if (errs.length >= reactions.length * 0.3) out.push({
      question_id: q.id,
      description: `IAT「${truncate(q.prompt, 20)}」中错答比例较高,你的内隐联想与外显判断可能存在分裂`,
      conflict_type: 'iat_implicit_explicit', severity: 2,
    })
    const rts = reactions.map(r => r.rt != null ? r.rt : 500)
    if (rts.length && Math.max(...rts) > rts.reduce((a, b) => a + b, 0) / rts.length * 2) out.push({
      question_id: q.id,
      description: `IAT「${truncate(q.prompt, 20)}」中部分词汇反应时显著延长,潜意识层面存在犹豫`,
      conflict_type: 'iat_hesitation', severity: 2,
    })
  }
  return out.slice(0, 2)
}

export function detectConflicts(
  _type: AssessmentType,
  answers: AnswerRecord[],
  _behavior: Record<string, unknown>,
  bank: QuestionBank,
): Conflict[] {
  const qById: Record<string, Question> = {}
  for (const q of bank.questions) qById[q.id] = q
  const durations = answers.map(a => a.duration_ms).filter(d => d > 0)
  const med = median(durations)
  const perQBest: Record<string, Conflict> = {}
  const dimDirections: Record<string, [string, number][]> = {}
  for (const ans of answers) {
    const q = qById[ans.question_id]
    if (!q) continue
    if (med > 0 && ans.duration_ms > med * 2.5) {
      const sev = ans.duration_ms > med * 4 ? 3 : 2
      const cand: Conflict = {
        question_id: q.id,
        description: `在「${truncate(q.prompt, 24)}」上犹豫较久,此处存在内在张力`,
        conflict_type: 'high_hesitation', severity: sev,
      }
      if (!perQBest[q.id] || cand.severity > perQBest[q.id].severity) perQBest[q.id] = cand
    }
    if (ans.change_count >= 3) {
      const sev = ans.change_count >= 4 ? 3 : 2
      const cand: Conflict = {
        question_id: q.id,
        description: `在「${truncate(q.prompt, 24)}」上多次改主意,价值未定型`,
        conflict_type: 'frequent_change', severity: sev,
      }
      if (!perQBest[q.id] || cand.severity > perQBest[q.id].severity) perQBest[q.id] = cand
    }
    if (q.time_limit_sec && q.type !== 'iat' && ans.duration_ms > q.time_limit_sec * 1000) {
      const cand: Conflict = {
        question_id: q.id,
        description: '限时题超时作答,本能反应可能与理性判断分裂',
        conflict_type: 'timeout_instinct', severity: 2,
      }
      if (!perQBest[q.id] || cand.severity > perQBest[q.id].severity) perQBest[q.id] = cand
    }
    _collectDirections(q, ans.answer, dimDirections)
  }
  let conflicts = Object.values(perQBest)
  conflicts = conflicts.concat(_detectDimensionConflicts(dimDirections, qById))
  conflicts = conflicts.concat(_detectIatConflicts(answers, qById))
  const seen: Record<string, Conflict> = {}
  for (const c of conflicts) {
    const qid = c.question_id || ''
    if (!seen[qid] || (c.severity || 1) > (seen[qid].severity || 1)) seen[qid] = c
  }
  const out = Object.values(seen).sort((a, b) => (b.severity || 1) - (a.severity || 1))
  return out.slice(0, 5)
}

// ===================== insights.py =====================
function _deriveIatBias(answers: AnswerRecord[]): Insight {
  const leftRts: number[] = []
  const rightRts: number[] = []
  for (const a of answers) {
    if (!a.answer || !a.answer.iat) continue
    for (const r of a.answer.iat) {
      const rt = r.rt != null ? r.rt : 500
      if (r.response === 'left') leftRts.push(rt)
      else if (r.response === 'right') rightRts.push(rt)
    }
  }
  if (!leftRts.length || !rightRts.length) return { code: 'no_data', label: '无数据', desc: '未检测到 IAT 反应', bias: 0 }
  const leftAvg = mean(leftRts), rightAvg = mean(rightRts)
  const diff = rightAvg - leftAvg
  let code: string, label: string, desc: string
  if (Math.abs(diff) < 80) { code = 'neutral'; label = '中立' }
  else if (diff > 0) { code = diff > 200 ? 'left_strong' : 'left_weak'; label = diff > 200 ? '偏左(强)' : '偏左(弱)' }
  else { code = diff < -200 ? 'right_strong' : 'right_weak'; label = diff < -200 ? '偏右(强)' : '偏右(弱)' }
  desc = label.includes('中立') ? '左右反应时接近,无明显内隐偏向' : `对${label.includes('左') ? '左侧' : '右侧'}概念反应${label.includes('强') ? '明显更快' : '略快'},内隐偏向${label.includes('强') ? '较强' : '存在轻微'}`
  return { code, label, desc, bias: Math.round(diff), left_avg_ms: Math.round(leftAvg), right_avg_ms: Math.round(rightAvg) }
}

function _deriveCourage(_type: AssessmentType, answers: AnswerRecord[], bank: QuestionBank): Insight {
  const qById: Record<string, Question> = {}
  for (const q of bank.questions) qById[q.id] = q
  let courageCount = 0, avoidCount = 0, total = 0
  for (const a of answers) {
    if (a.answer == null || a.answer.option_id == null) continue
    const q = qById[a.question_id]
    if (!q || q.type !== 'dilemma') continue
    const optId = a.answer.option_id
    let tag: string | null = null
    for (const opt of q.options) if (strEq(opt.id, optId)) { tag = opt.tag || null; break }
    if (tag == null) continue
    total++
    if (tag === 'courage') courageCount++
    else if (tag === 'avoidance') avoidCount++
  }
  // code:语言中立枚举,report 据此走 i18n;label/desc 保留中文兜底(兼容旧分享链接)
  if (total === 0) return { code: 'no_data', label: '无数据', desc: '无困境题数据', score: 0 }
  const pct = Math.round(courageCount / total * 100)
  let code: string, label: string, desc: string
  if (pct >= 70) { code = 'high'; label = '高'; desc = '多数困境中选择承担代价,理想主义色彩浓厚' }
  else if (pct >= 40) { code = 'mid'; label = '中'; desc = '在承担与回避间权衡,视情境而定' }
  else { code = 'low'; label = '低'; desc = '多数困境中选择回避代价,现实审慎' }
  return { code, label, desc, score: pct, courage_count: courageCount, total }
}

function _deriveAmbivalence(_answers: AnswerRecord[], durations: number[], changes: number[]): Insight {
  if (!durations.length) return { code: 'no_data', label: '无数据', desc: '无行为数据', score: 0 }
  const med = median(durations)
  const longCount = durations.filter(d => d > med * 2.5).length
  const longPct = longCount / durations.length * 100
  const changeCount = changes.filter(c => c >= 3).length
  const changePct = changes.length ? changeCount / changes.length * 100 : 0
  const score = Math.round(longPct * 0.5 + changePct * 0.5)
  let code: string, label: string, desc: string
  if (score >= 50) { code = 'high'; label = '高'; desc = '多题犹豫或改主意,内在价值未定型' }
  else if (score >= 25) { code = 'mid'; label = '中'; desc = '部分题目存在犹豫,整体方向清晰' }
  else { code = 'low'; label = '低'; desc = '决策流畅,价值体系稳定' }
  return { code, label, desc, score, long_pct: Math.round(longPct), change_pct: Math.round(changePct) }
}

export function deriveInsights(_type: AssessmentType, answers: AnswerRecord[], _behavior: Record<string, unknown>, bank: QuestionBank): Insights {
  const durations = answers.map(a => a.duration_ms).filter(d => d > 0)
  const changes = answers.map(a => a.change_count || 0)
  const avgMs = mean(durations)
  let styleCode: string, style: string, styleDesc: string
  if (avgMs < 3000) { styleCode = 'intuitive'; style = '直觉型'; styleDesc = '快速决策,凭直觉作答,少有犹豫' }
  else if (avgMs > 8000) { styleCode = 'deliberate'; style = '深思型'; styleDesc = '审慎权衡,决策耗时较长,注重细节' }
  else { styleCode = 'balanced'; style = '平衡型'; styleDesc = '在直觉与深思之间,视题而定' }
  const avgChanges = mean(changes)
  let consistencyCode: string, consistency: string, consistencyDesc: string
  if (avgChanges < 0.3) { consistencyCode = 'high'; consistency = '高'; consistencyDesc = '答案稳定,少有改主意,价值体系清晰' }
  else if (avgChanges < 1.0) { consistencyCode = 'mid'; consistency = '中'; consistencyDesc = '偶尔调整,整体方向稳定' }
  else { consistencyCode = 'low'; consistency = '低'; consistencyDesc = '频繁改主意,价值尚未定型' }
  const qById: Record<string, Question> = {}
  for (const q of bank.questions) qById[q.id] = q
  const timedDurations: number[] = []
  const untimedDurations: number[] = []
  for (const a of answers) {
    const q = qById[a.question_id]
    if (!q || a.duration_ms <= 0) continue
    if (q.time_limit_sec && q.type !== 'iat') timedDurations.push(a.duration_ms)
    else untimedDurations.push(a.duration_ms)
  }
  let pressureCode: string, pressure: string, pressureDesc: string
  if (timedDurations.length && untimedDurations.length) {
    const timedAvg = mean(timedDurations), untimedAvg = mean(untimedDurations)
    const ratio = untimedAvg > 0 ? timedAvg / untimedAvg : 1
    if (ratio < 0.3) { pressureCode = 'accel_strong'; pressure = '显著加速'; pressureDesc = '时间压力下大幅压缩决策,可能偏离真实倾向' }
    else if (ratio < 0.7) { pressureCode = 'accel_mild'; pressure = '适度加速'; pressureDesc = '时间压力下有所加速,但仍在可控范围' }
    else { pressureCode = 'stable'; pressure = '稳定'; pressureDesc = '时间压力影响小,决策风格一致' }
  } else { pressureCode = 'no_data'; pressure = '数据不足'; pressureDesc = '无限时题对比,无法分析时间压力效应' }
  const iatInsight = _deriveIatBias(answers)
  const courage = _deriveCourage(_type, answers, bank)
  const ambivalence = _deriveAmbivalence(answers, durations, changes)
  return {
    decision_style: { code: styleCode, label: style, desc: styleDesc, avg_duration_ms: Math.round(avgMs) },
    time_pressure_effect: { code: pressureCode, label: pressure, desc: pressureDesc },
    consistency: { code: consistencyCode, label: consistency, desc: consistencyDesc, avg_changes: Math.round(avgChanges * 100) / 100 },
    iat_bias: iatInsight,
    courage_index: courage,
    ambivalence: ambivalence,
  }
}

// ===================== percentiles.py =====================
const BASELINES: Record<AssessmentType, Record<string, [number, number]>> = {
  celebrity: { openness: [60, 15], conscientiousness: [50, 15], extraversion: [50, 15], agreeableness: [55, 15], neuroticism: [50, 18], risk_taking: [40, 18], idealism: [55, 18] },
  value: { honesty: [62, 15], altruism: [58, 15], justice: [60, 15], duty: [60, 15], empathy: [60, 15], discipline: [55, 15] },
  ideology: { econ_left: [45, 18], econ_right: [55, 18], authority: [55, 18], liberty: [45, 18], tradition: [50, 18], progress: [50, 18], nationalist: [52, 18], globalist: [48, 18] },
}

export function estimatePercentiles(type: AssessmentType, dimensions: ScoreMap): ScoreMap {
  const baseline = BASELINES[type] || {}
  const out: ScoreMap = {}
  for (const [dim, score] of Object.entries(dimensions)) {
    if (baseline[dim]) {
      const [mu, sigma] = baseline[dim]
      const pct = normalCdf(score, mu, sigma) * 100
      out[dim] = Math.round(Math.max(1, Math.min(99, pct)) * 10) / 10
    } else out[dim] = 50.0
  }
  return out
}

// ===================== summary.py =====================
function _celebritySummary(dimensions: ScoreMap, matches: Match[]): string {
  if (!matches || !matches.length) return '你的人格组合太特殊,镜子里照不出任何已有的名字。'
  const top = matches[0]
  const dimNames: Record<string, string> = { openness: '开放', conscientiousness: '自律', extraversion: '外向', agreeableness: '温厚', neuroticism: '敏感', risk_taking: '冒险', idealism: '理想主义' }
  if (dimensions && Object.keys(dimensions).length) {
    const topDim = Object.keys(dimensions).reduce((a, b) => (dimensions[a] >= dimensions[b] ? a : b))
    const dimLabel = dimNames[topDim] || topDim
    return `镜子里有${top.name}的影子。${top.blurb} 最显眼的是${dimLabel}——${dimensions[topDim]}分,其余特质都围着它转。`
  }
  return `镜子里有${top.name}的影子。${top.blurb}`
}

function _valueSummary(_dimensions: ScoreMap, matches: Match[]): string {
  if (!matches || !matches.length) return '你的价值结构太特殊,很难用一个标签概括。'
  const tier = matches[0].name.includes(':') ? matches[0].name.split(':').slice(1).join(':') : matches[0].name
  const moralScore = matches[0].match_pct || 0
  const blurb = matches[0].blurb || ''
  if (matches.length > 1) {
    const vtype = matches[1].name.includes(':') ? matches[1].name.split(':').slice(1).join(':') : ''
    return `你落在「${tier}」这一档,${vtype ? '外加' + vtype + '的底色' : ''}道德直觉${moralScore}分。${blurb}`
  }
  return `你落在「${tier}」这一档,道德直觉${moralScore}分。${blurb}`
}

function _ideologySummary(dimensions: ScoreMap, matches: Match[]): string {
  if (!matches || !matches.length) return '你的政治坐标落在一片无人标记的空地。'
  const top = matches[0]
  const econ = (dimensions.econ_right != null ? dimensions.econ_right : 50) - (dimensions.econ_left != null ? dimensions.econ_left : 50)
  const auth = (dimensions.authority != null ? dimensions.authority : 50) - (dimensions.liberty != null ? dimensions.liberty : 50)
  const trad = (dimensions.tradition != null ? dimensions.tradition : 50) - (dimensions.progress != null ? dimensions.progress : 50)
  const nat = (dimensions.nationalist != null ? dimensions.nationalist : 50) - (dimensions.globalist != null ? dimensions.globalist : 50)
  const lbl = (v: number, pos: string, neg: string) => v > 12 ? pos : (v < -12 ? neg : '')
  const axisDescParts = [lbl(econ, '经济上偏右', '经济上偏左'), lbl(auth, '社会偏权威', '社会偏自由'), lbl(trad, '文化偏传统', '文化偏进步'), lbl(nat, '国际立场偏民族', '国际立场偏全球')].filter(b => !b.endsWith('均衡'))
  const axisDesc = axisDescParts.join('，')
  const top3 = matches.slice(0, 3)
  let near = `「${top.name}」(${top.match_pct}%)`
  if (top3.length > 1) near += `，其次「${top3.slice(1).map(m => m.name).join('」「')}」`
  if (axisDesc) return `你的政治画像：${axisDesc}。计算引擎匹配你最接近${near}。${top.blurb}`
  return `计算引擎匹配你最接近${near}。${top.blurb}`
}

export function buildSummary(type: AssessmentType, dimensions: ScoreMap, matches: Match[]): string {
  if (type === 'celebrity') return _celebritySummary(dimensions, matches)
  if (type === 'value') return _valueSummary(dimensions, matches)
  if (type === 'ideology') return _ideologySummary(dimensions, matches)
  return '镜中人,就是你。'
}

// ===================== _build_profile =====================
function _buildProfile(type: AssessmentType, dimensions: ScoreMap, insights: Insights, ideologies: Ideology[]): { tags: string[] } {
  const profile: string[] = []
  const style = (insights.decision_style || {}).label || ''
  if (style === '直觉型') profile.push('直觉驱动')
  else if (style === '深思型') profile.push('审慎深思')
  else profile.push('平衡决策')
  const consistency = (insights.consistency || {}).label || ''
  if (consistency === '低') profile.push('价值流动')
  else if (consistency === '高') profile.push('立场坚定')
  if (type === 'celebrity') {
    const topDims = Object.entries(dimensions).sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50)).slice(0, 3)
    const labelMap: Record<string, string> = { openness: '开放探索', conscientiousness: '尽责自律', extraversion: '外向主动', agreeableness: '温和利他', neuroticism: '敏感深邃', risk_taking: '冒险敢为', idealism: '理想主义' }
    const lowMap: Record<string, string> = { openness: '务实保守', conscientiousness: '灵活随性', extraversion: '内敛沉静', agreeableness: '独立冷峻', neuroticism: '情绪稳定', risk_taking: '谨慎稳重', idealism: '现实务实' }
    for (const [k, v] of topDims) { if (v >= 60) profile.push(labelMap[k] || k); else if (v <= 40) profile.push(lowMap[k] || k) }
  } else if (type === 'value') {
    const moralDims = ['honesty', 'altruism', 'justice', 'duty', 'empathy', 'discipline']
    const moral = moralDims.reduce((acc, d) => acc + (dimensions[d] != null ? dimensions[d] : 50), 0) / 6
    if (moral >= 85) profile.push('理想主义者')
    else if (moral >= 70) profile.push('端方君子')
    else if (moral >= 55) profile.push('守正之人')
    else if (moral >= 40) profile.push('务实者')
    else profile.push('失序灵魂')
    const top = moralDims.reduce((a, b) => ((dimensions[a] != null ? dimensions[a] : 0) >= (dimensions[b] != null ? dimensions[b] : 0) ? a : b))
    const typeMap: Record<string, string> = { honesty: '诚实至上', altruism: '利他之心', justice: '公正守护', duty: '责任担当', empathy: '共情体察', discipline: '自律节制' }
    profile.push(typeMap[top] || top)
  } else if (type === 'ideology') {
    const topIdeology = matchIdeology(dimensions, ideologies)[0]
    if (topIdeology) profile.push('近' + topIdeology.name)
    const econ = (dimensions.econ_right != null ? dimensions.econ_right : 50) - (dimensions.econ_left != null ? dimensions.econ_left : 50)
    const auth = (dimensions.authority != null ? dimensions.authority : 50) - (dimensions.liberty != null ? dimensions.liberty : 50)
    const trad = (dimensions.tradition != null ? dimensions.tradition : 50) - (dimensions.progress != null ? dimensions.progress : 50)
    const nat = (dimensions.nationalist != null ? dimensions.nationalist : 50) - (dimensions.globalist != null ? dimensions.globalist : 50)
    if (econ > 12) profile.push('经济右倾'); else if (econ < -12) profile.push('经济左倾'); else profile.push('经济中道')
    if (auth > 12) profile.push('秩序优先'); else if (auth < -12) profile.push('自由优先'); else profile.push('社会均衡')
    if (trad > 12) profile.push('传统派'); else if (trad < -12) profile.push('进步派'); else profile.push('文化居中')
    if (nat > 12) profile.push('民族本位'); else if (nat < -12) profile.push('国际主义'); else profile.push('国际均衡')
  }
  const seen = new Set<string>()
  const unique: string[] = []
  for (const p of profile) { if (!seen.has(p)) { seen.add(p); unique.push(p) } if (unique.length >= 6) break }
  return { tags: unique }
}

// ===================== 主入口 =====================
/**
 * 计算测评结果。bank/celebrities/ideologies 由调用方传入(已从 TS 模块 import)。
 * 与原 scoring.js computeResult 行为 1:1 一致。
 */
export function computeResult(
  type: AssessmentType,
  version: AssessmentVersion,
  answers: AnswerRecord[],
  bank: QuestionBank,
  celebrities: Celebrity[],
  ideologies: Ideology[],
  behavior: Record<string, unknown> = {},
): ComputeResult {
  const filteredBank = filterBank(bank, version || 'standard')
  const dimensions = scoreAnswers(type, answers, version || 'standard', filteredBank)
  const matches = getMatcher(type)(dimensions, celebrities, ideologies)
  const conflicts = detectConflicts(type, answers, behavior, filteredBank)
  const insights = deriveInsights(type, answers, behavior, filteredBank)
  const percentiles = estimatePercentiles(type, dimensions)
  const summary = buildSummary(type, dimensions, matches)
  const profile = _buildProfile(type, dimensions, insights, ideologies)
  return { dimensions, matches, conflicts, insights, percentiles, summary, profile }
}
