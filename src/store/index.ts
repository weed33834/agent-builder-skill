/**
 * 全局状态(Zustand) —— 全项目仅 4 个跨页状态,杀鸡不用牛刀,不引 Redux。
 *
 * 1. lang:当前语言(zh/en/ja),替代原 localStorage mm_lang + mm:lang-changed 事件
 * 2. muted:静音状态,替代 localStorage mindmirror_muted + mm:mutechange 事件
 * 3. draft:答题草稿,替代 localStorage mindmirror_draft_{type}
 * 4. lastResult:最近结果 base64,替代 localStorage mindmirror_last_result
 *
 * 持久化:每个 store 用 zustand/middleware persist 到 localStorage,key 沿用原约定
 * (旧分享链接兼容)。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AssessmentType } from '@/lib/types'

// ===================== 1. 语言 =====================
export type Lang = 'zh' | 'en' | 'ja'

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'zh',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'mm_lang' }, // 沿用原 key
  ),
)

// ===================== 2. 静音 =====================
interface MuteState {
  muted: boolean
  setMuted: (m: boolean) => void
  toggleMute: () => boolean
}

export const useMuteStore = create<MuteState>()(
  persist(
    (set, get) => ({
      muted: false,
      setMuted: (muted) => set({ muted }),
      toggleMute: () => { const next = !get().muted; set({ muted: next }); return next },
    }),
    {
      name: 'mindmirror_muted', // 沿用原 key
      // 原 localStorage 存 '1'/'0' 字符串,这里做兼容转换
      storage: {
        getItem: (name) => {
          const raw = localStorage.getItem(name)
          if (raw == null) return null
          // 兼容旧格式 '1'/'0'
          if (raw === '1') return { state: { muted: true } }
          if (raw === '0') return { state: { muted: false } }
          return JSON.parse(raw)
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)

// ===================== 3. 答题草稿 =====================
interface DraftPayload {
  answers: unknown[]      // AnswerRecord[],用 unknown 避免循环依赖 types
  currentIdx: number
  startedAt: number
  version: string
}

interface DraftState {
  drafts: Partial<Record<AssessmentType, DraftPayload>>
  saveDraft: (type: AssessmentType, payload: DraftPayload) => void
  loadDraft: (type: AssessmentType) => DraftPayload | undefined
  clearDraft: (type: AssessmentType) => void
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},
      saveDraft: (type, payload) =>
        set((s) => ({ drafts: { ...s.drafts, [type]: payload } })),
      loadDraft: (type) => get().drafts[type],
      clearDraft: (type) =>
        set((s) => {
          const next = { ...s.drafts }
          delete next[type]
          return { drafts: next }
        }),
    }),
    {
      name: 'mindmirror_draft', // 单 key 存所有草稿(原为 mindmirror_draft_{type} 分键)
      // 分键迁移:首次加载时尝试从旧 key 收编
      onRehydrateStorage: () => (state) => {
        if (state && Object.keys(state.drafts).length === 0) {
          for (const t of ['celebrity', 'value', 'ideology'] as AssessmentType[]) {
            const old = localStorage.getItem(`mindmirror_draft_${t}`)
            if (old) {
              try {
                state.drafts[t] = JSON.parse(old)
              } catch { /* 忽略损坏的旧草稿 */ }
            }
          }
        }
      },
    },
  ),
)

// ===================== 4. 最近结果 =====================
interface LastResultState {
  result: string | null    // base64 编码的 {type, result}
  setLastResult: (r: string) => void
}

export const useLastResultStore = create<LastResultState>()(
  persist(
    (set) => ({
      result: null,
      setLastResult: (result) => set({ result }),
    }),
    { name: 'mindmirror_last_result' }, // 沿用原 key
  ),
)

// ===================== 5. 测评历史(本地) =====================
// Supabase 未配置时,以 localStorage 作为持久层,保证 Profile / MyAssessments 可用。
// 每条记录保留足够元数据 + base64 share(可重建报告)。
export interface HistoryRecord {
  id: string
  assessment_id: string  // celebrity | value | ideology | galgame | galgame-char
  created_at: string     // ISO
  duration_sec: number | null
  question_count: number
  summary: string
  share: string          // base64 编码的 {type, result}
}

interface HistoryState {
  records: HistoryRecord[]
  addRecord: (r: Omit<HistoryRecord, 'id' | 'created_at'>) => void
  clearHistory: () => void
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (r) =>
        set((s) => ({
          // 保留最近 100 条,避免 localStorage 无限增长
          records: [{ ...r, id: genId(), created_at: new Date().toISOString() }, ...s.records].slice(0, 100),
        })),
      clearHistory: () => set({ records: [] }),
    }),
    { name: 'mindmirror_history' },
  ),
)
