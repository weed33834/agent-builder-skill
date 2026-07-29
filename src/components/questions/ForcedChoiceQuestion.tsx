/**
 * 强制二选一 —— 两面卡片(A/B),点击 350ms 后提交 choice(原 renderForcedChoice)。
 * 算分权重 1.5x,无中间地带。
 */
import { useEffect, useState } from 'react'
import type { ForcedChoiceQuestion as ForcedQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import type { QuestionProps } from './types'

export function ForcedChoiceQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<ForcedQ>) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    getAnswerRef.current = () => (selected ? { choice: selected } : {})
  }, [selected, getAnswerRef])

  const choose = (id: string) => {
    if (locked) return
    setLocked(true)
    setSelected(id)
    tracker.recordChange(id)
    setTimeout(() => onAnswer({ choice: id }), 350)
  }

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <p className="question-hint center">{t('take.forced_choice_hint')}</p>
      <div className="fc-area" data-q={q.id}>
        <div className="fc-cards">
          {q.sides.map((s, i) => (
            <div
              key={s.id}
              className={`fc-card${selected === s.id ? ' selected' : ''}`}
              data-id={s.id}
              onClick={() => choose(s.id)}
            >
              <div className="fc-letter">{String.fromCharCode(65 + i)}</div>
              <div className="fc-text">{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
