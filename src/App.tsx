/**
 * 阶段 0 占位入口 —— 仅验证脚手架 + scoring + 数据层 + store 可正常 import 和构建。
 * 阶段 1 接入 React Router 后替换为真实路由根。
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import { assessments } from '@/lib/data'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="font-display text-4xl text-ink">心镜 MindMirror</h1>
        <p className="text-ink-soft text-center max-w-md">
          阶段 0 脚手架已就绪:React + TS + Vite + Tailwind + shadcn + TanStack Query + Zustand。
          scoring.ts 已移植,数据层已配,store 已建。
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {assessments.map((a) => (
            <span key={a.type} className="px-3 py-1 border border-line rounded text-sm text-ink-soft">
              {a.title} · {a.question_count}题 · {a.estimated_minutes}分钟
            </span>
          ))}
        </div>
        <p className="text-ink-faint text-sm">
          阶段 1 将接入 React Router,迁移 layout 组件与静态页。
        </p>
      </div>
    </QueryClientProvider>
  )
}
