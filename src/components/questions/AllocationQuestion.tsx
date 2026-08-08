/**
 * 资源分配 —— 各目标百分比配平,总和须 = total(原 renderAllocation)。
 * 滑块 + ±1/±10 按钮 + 自动配平;确认时校验总和。
 */
import { useEffect, useMemo, useState } from 'react'
import type { AllocationQuestion as AllocQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/lib/utils'
import type { QuestionProps } from './types'

export function AllocationQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<AllocQ>) {
  const { t } = useI18n()
  const total = q.total
  const [alloc, setAlloc] = useState<Record<string, number>>(() =>
    Object.fromEntries(q.targets.map((x) => [x.id, 0])),
  )

  const sum = useMemo(() => Object.values(alloc).reduce((a, b) => a + b, 0), [alloc])
  const touched = sum > 0
  const maxVal = Math.max(...Object.values(alloc), 0)

  useEffect(() => {
    getAnswerRef.current = () => (touched ? { allocation: alloc } : {})
  }, [alloc, touched, getAnswerRef])

  const setRow = (id: string, newVal: number) => {
    const v = Math.max(0, Math.min(total, newVal))
    setAlloc((prev) => ({ ...prev, [id]: v }))
  }

  const autoBalance = () => {
    setAlloc((prev) => {
      const next = { ...prev }
      let diff = total - Object.values(next).reduce((a, b) => a + b, 0)
      if (diff === 0) return next
      let guard = 0
      while (diff !== 0 && guard++ < q.targets.length + 2) {
        // 找当前最大项
        let maxId = q.targets[0].id
        for (const tg of q.targets) if ((next[tg.id] || 0) > (next[maxId] || 0)) maxId = tg.id
        const cur = next[maxId] || 0
        const nv = Math.max(0, Math.min(total, cur + diff))
        const actual = nv - cur
        diff -= actual
        next[maxId] = nv
      }
      tracker.recordChange(total)
      return next
    })
  }

  const confirm = () => {
    if (sum !== total) {
      toast(t('take.alert_alloc_sum', { total, sum }), 'warn')
      return
    }
    onAnswer({ allocation: alloc })
  }

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <p className="question-hint">{t('take.alloc_hint', { total })}</p>
      <div data-q={q.id} className="alloc-list">
        {q.targets.map((tg) => (
          <div className="alloc-row" key={tg.id} data-id={tg.id} data-peak={alloc[tg.id] > 0 && alloc[tg.id] === maxVal}>
            <div className="alloc-head">
              <label>{tg.text}</label>
              <div className="alloc-controls">
                <button className="alloc-btn" onClick={() => { setRow(tg.id, alloc[tg.id] - 10); tracker.recordChange(alloc[tg.id]) }} aria-label={t('take.btn_minus', { n: 10 })}>−10</button>
                <button className="alloc-btn" onClick={() => { setRow(tg.id, alloc[tg.id] - 1); tracker.recordChange(alloc[tg.id]) }} aria-label={t('take.btn_minus', { n: 1 })}>−1</button>
                <span className="val">{alloc[tg.id]}</span>
                <button className="alloc-btn" onClick={() => { setRow(tg.id, alloc[tg.id] + 1); tracker.recordChange(alloc[tg.id]) }} aria-label={t('take.btn_plus', { n: 1 })}>+1</button>
                <button className="alloc-btn" onClick={() => { setRow(tg.id, alloc[tg.id] + 10); tracker.recordChange(alloc[tg.id]) }} aria-label={t('take.btn_plus', { n: 10 })}>+10</button>
              </div>
            </div>
            <div className="alloc-bar"><div className="alloc-bar-fill" style={{ width: `${(alloc[tg.id] / total) * 100}%` }} /></div>
            <input
              type="range"
              min={0}
              max={total}
              value={alloc[tg.id]}
              aria-label={tg.text}
              onChange={(e) => { setRow(tg.id, +e.target.value); tracker.recordChange(+e.target.value) }}
            />
          </div>
        ))}
        <div className={`alloc-total${sum === total ? ' ok' : ''}${sum > total ? ' over' : ''}`}>
          <span>{t('take.total_label')}</span>
          <span className="num">{sum}</span>
          <span className="sep">/</span>
          <span className="target">{total}</span>
          <button className="alloc-balance" type="button" onClick={autoBalance}>{t('take.auto_balance')}</button>
        </div>
      </div>
      <button className="btn-primary" style={{ marginTop: 40, display: 'block', width: '100%' }} onClick={confirm}>
        {t('common.confirm')}
      </button>
    </div>
  )
}
