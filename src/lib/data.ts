/**
 * 数据加载层 —— 替换原项目的裸 fetch。
 * 数据已转为 TS 模块(build_bank.py 生成),这里做按测评类型的动态 import,
 * 让 Vite 自动做路由级 code split(题库 JSON 上百 KB,不应全打进主 bundle)。
 *
 * 与原 scoring.js loadBank/loadCelebrities/loadIdeologies 的内存缓存语义一致,
 * 但走 ES module 缓存(同模块多次 import 返回同一实例),无需自建 _cache。
 */
import type { AssessmentType, Celebrity, Ideology, QuestionBank } from './types'

// 按需 import:celebrity/value/ideology 三题库各自独立 chunk
const bankLoaders: Record<AssessmentType, () => Promise<{ default: QuestionBank }>> = {
  celebrity: () => import('@/data/questions/celebrity'),
  value: () => import('@/data/questions/value'),
  ideology: () => import('@/data/questions/ideology'),
}

export function loadBank(type: AssessmentType): Promise<QuestionBank> {
  return bankLoaders[type]().then(m => m.default)
}

// 名人库/意识形态库:首次访问报告页或人物页时才加载
let _celebrities: Promise<Celebrity[]> | null = null
export function loadCelebrities(): Promise<Celebrity[]> {
  if (!_celebrities) _celebrities = import('@/data/figures/celebrity').then(m => m.default)
  return _celebrities
}

let _ideologies: Promise<Ideology[]> | null = null
export function loadIdeologies(): Promise<Ideology[]> {
  if (!_ideologies) _ideologies = import('@/data/ideologies/ideology').then(m => m.default)
  return _ideologies
}

// 测评元数据:首页头部下拉用,体积小,直接静态 import
import assessmentsData from '@/data/assessments'
import type { AssessmentMeta } from './types'
export const assessments: AssessmentMeta[] = assessmentsData
