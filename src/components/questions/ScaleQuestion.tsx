/**
 * 量表题 —— 选点得分。点击/键盘选中后 300ms 自动进入下一题(原 renderScale)。
 */
import { useEffect, useState } from 'react'
import type { ScaleQuestion as ScaleQ } from '@/lib/types'
import type { QuestionProps } from './types'

export function ScaleQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<ScaleQ>) {
  const [selected, setSelected] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    getAnswerRef.current = () => (selected ? { option_id: selected } : {})
  }, [selected, getAnswerRef])

  const choose = (id: string) => {
    if (locked) return
    setLocked(true)
    setSelected(id)
    tracker.recordChange(id)
    setTimeout(() => onAnswer({ option_id: id }), 300)
  }

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <div className="scale-points" data-q={q.id} role="radiogroup">
        {q.points.map((p) => (
          <div
            key={p.id}
            className={`scale-point${selected === p.id ? ' selected' : ''}`}
            data-id={p.id}
            role="radio"
            aria-checked={selected === p.id}
            tabIndex={0}
            onClick={() => choose(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(p.id) }
            }}
          >
            {p.text}
          </div>
        ))}
      </div>
    </div>
  )
}
