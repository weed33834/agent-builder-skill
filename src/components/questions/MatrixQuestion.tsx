/**
 * 同意度矩阵 —— 每条陈述选 1..scale_max,点击填到该位置(原 renderMatrix)。
 * 全部评分后方可确认,提交 ratings {stmt_id: val}。
 */
import { useEffect, useState } from 'react'
import type { MatrixQuestion as MatrixQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/lib/utils'
import type { QuestionProps } from './types'

export function MatrixQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<MatrixQ>) {
  const { t } = useI18n()
  const smax = q.scale_max || 7
  const labels = t<string[]>('take.matrix_labels')
  const [ratings, setRatings] = useState<Record<string, number>>({})

  useEffect(() => {
    getAnswerRef.current = () => (Object.keys(ratings).length ? { ratings } : {})
  }, [ratings, getAnswerRef])

  const setVal = (stmtId: string, val: number) => {
    setRatings((prev) => ({ ...prev, [stmtId]: val }))
    tracker.recordChange(val)
  }

  const confirm = () => {
    if (q.statements.some((s) => !ratings[s.id])) {
      toast(t('take.alert_matrix_incomplete'), 'warn')
      return
    }
    onAnswer({ ratings })
  }

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <p className="question-hint">{t('take.matrix_hint')}</p>
      <div className="matrix-area" data-q={q.id}>
        <div className="matrix-header">
          <span />
          <div>
            <div className="matrix-anchors">
              <span>{labels[0]}</span>
              <span>{labels[smax - 1]}</span>
            </div>
            <div className="matrix-scale-labels">
              {labels.slice(0, smax).map((_, i) => <span key={i}>{i + 1}</span>)}
            </div>
          </div>
        </div>
        {q.statements.map((s) => (
          <div className="matrix-row" key={s.id} data-id={s.id}>
            <div className="matrix-text">{s.text}</div>
            <div className="matrix-scale">
              {Array.from({ length: smax }, (_, i) => {
                const v = i + 1
                const filled = (ratings[s.id] || 0) >= v
                return (
                  <div
                    key={v}
                    className={`matrix-dot${filled ? ' selected' : ''}`}
                    data-val={v}
                    onClick={() => setVal(s.id, v)}
                  />
                )
              })}
            </div>
          </div>
        ))}
        <button
          className="btn-primary"
          style={{ marginTop: 40, display: 'block', width: '100%' }}
          onClick={confirm}
        >
          {t('common.confirm')}
        </button>
      </div>
    </div>
  )
}
