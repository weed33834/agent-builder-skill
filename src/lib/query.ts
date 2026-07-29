/**
 * TanStack Query 配置。
 * 替换原项目各处裸 fetch(url).json() 无超时/无重试/无统一错误处理的痛点。
 * queryKey 用 ['bank', type] 这类层级 key,跨组件共享缓存。
 */
import { QueryClient } from '@tanstack/react-query'
import type { AssessmentType } from './types'
import { loadBank, loadCelebrities, loadIdeologies } from './data'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据是构建期产出的静态 TS 模块,不会变,缓存永久
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
  },
})

// ===================== Query Keys =====================
export const qk = {
  bank: (type: AssessmentType, version?: string) => ['bank', type, version] as const,
  celebrities: () => ['celebrities'] as const,
  ideologies: () => ['ideologies'] as const,
}

// ===================== Query Fetchers =====================
export const fetchBank = (type: AssessmentType) => loadBank(type)
export const fetchCelebrities = () => loadCelebrities()
export const fetchIdeologies = () => loadIdeologies()
