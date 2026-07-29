/**
 * 排序题 —— 拖拽或上下箭头排序,1 = 最重要(原 renderSort)。
 * 入场时 Fisher-Yates 洗牌;确认提交 order [item_id,...]。
 */
import { useEffect, useRef, useState } from 'react'
import type { SortItem, SortQuestion as SortQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import type { QuestionProps } from './types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function SortQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<SortQ>) {
  const { t } = useI18n()
  const [items, setItems] = useState<SortItem[]>(() => shuffle(q.items))
  const dragIdx = useRef<number | null>(null)

  useEffect(() => {
    getAnswerRef.current = () => ({ order: items.map((x) => x.id) })
  }, [items, getAnswerRef])

  const record = (arr: SortItem[]) => tracker.recordChange(arr.map((x) => x.id))

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      record(next)
      return next
    })
  }

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <p className="question-hint">{t('take.sort_hint')}</p>
      <div className="sort-list" data-q={q.id}>
        {items.map((it, i) => (
          <div
            key={it.id}
            className="sort-item"
            data-id={it.id}
            draggable
            onDragStart={() => { dragIdx.current = i }}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragIdx.current === null || dragIdx.current === i) return
              const from = dragIdx.current
              dragIdx.current = i
              setItems((prev) => {
                const next = [...prev]
                const [m] = next.splice(from, 1)
                next.splice(i, 0, m)
                record(next)
                return next
              })
            }}
            onDragEnd={() => { dragIdx.current = null; record(items) }}
          >
            <div className="sort-controls">
              <button className="sort-move" aria-label={t('take.sort_move_up')} onClick={(e) => { e.stopPropagation(); move(i, i - 1) }}>▲</button>
              <button className="sort-move" aria-label={t('take.sort_move_down')} onClick={(e) => { e.stopPropagation(); move(i, i + 1) }}>▼</button>
            </div>
            <span className="order">{i + 1}</span>
            <span className="sort-text">{it.text}</span>
          </div>
        ))}
      </div>
      <button
        className="btn-primary"
        style={{ marginTop: 40, display: 'block', width: '100%' }}
        onClick={() => onAnswer({ order: items.map((x) => x.id) })}
      >
        {t('common.confirm')}
      </button>
    </div>
  )
}
