/**
 * 困境题 —— 两难场景选项。选中后 300ms 自动进入下一题(原 renderDilemma)。
 * 可选 historical_figure,显示"历史上 {figure} 亦曾面对相似抉择"提示。
 */
import { useEffect, useState } from 'react'
import type { DilemmaQuestion as DilemmaQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import type { QuestionProps } from './types'

export function DilemmaQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<DilemmaQ>) {
  const { t } = useI18n()
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
      <div className="scenario">{q.scenario}</div>
      <div className="options" data-q={q.id} role="radiogroup">
        {q.options.map((o) => (
          <div
            key={o.id}
            className={`option${selected === o.id ? ' selected' : ''}`}
            data-id={o.id}
            role="radio"
            aria-checked={selected === o.id}
            tabIndex={0}
            onClick={() => choose(o.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.id) }
            }}
          >
            {o.text}
          </div>
        ))}
      </div>
      {q.historical_figure ? (
        <p className="question-hint center mt">
          {t('take.dilemma_historical', { figure: q.historical_figure })}
        </p>
      ) : null}
    </div>
  )
}
