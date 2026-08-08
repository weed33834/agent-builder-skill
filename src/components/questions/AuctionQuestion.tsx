/**
 * 价值拍卖 —— 预算分配出价,单行不超剩余预算(原 renderAuction)。
 * 可保留预算;确认时校验总出价 ≤ budget。
 */
import { useEffect, useMemo, useState } from 'react'
import type { AuctionQuestion as AuctionQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/lib/utils'
import type { QuestionProps } from './types'

export function AuctionQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<AuctionQ>) {
  const { t } = useI18n()
  const budget = q.budget
  const [bids, setBids] = useState<Record<string, number>>(() =>
    Object.fromEntries(q.items.map((x) => [x.id, 0])),
  )

  const sum = useMemo(() => Object.values(bids).reduce((a, b) => a + b, 0), [bids])
  const remaining = budget - sum
  const touched = sum > 0
  const maxBid = Math.max(...Object.values(bids), 0)

  useEffect(() => {
    getAnswerRef.current = () => (touched ? { bids } : {})
  }, [bids, touched, getAnswerRef])

  const setRow = (id: string, newVal: number) => {
    setBids((prev) => {
      const others = sum - (prev[id] || 0)
      const maxAllowed = budget - others
      const v = Math.max(0, Math.min(maxAllowed, newVal))
      return { ...prev, [id]: v }
    })
  }

  const confirm = () => {
    if (sum > budget) {
      toast(t('take.alert_auction_over', { budget, sum }), 'warn')
      return
    }
    onAnswer({ bids })
  }

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <div className="auction-area" data-q={q.id} data-budget={budget}>
        <div className={`auction-budget${remaining < 0 ? ' over' : ''}${remaining === 0 ? ' ok' : ''}`}>
          <span>{t('take.auction_remaining')}</span>
          <span className="auction-remaining">{remaining}</span>
          <span> / {budget}</span>
        </div>
        {q.items.map((it) => (
          <div
            className="auction-row"
            key={it.id}
            data-id={it.id}
            data-peak={bids[it.id] > 0 && bids[it.id] === maxBid}
          >
            <div className="auction-head">
              <label>{it.text}</label>
              <div className="alloc-controls">
                <button className="alloc-btn" onClick={() => { setRow(it.id, bids[it.id] - 10); tracker.recordChange(bids[it.id]) }} aria-label={t('take.btn_minus', { n: 10 })}>−10</button>
                <button className="alloc-btn" onClick={() => { setRow(it.id, bids[it.id] - 1); tracker.recordChange(bids[it.id]) }} aria-label={t('take.btn_minus', { n: 1 })}>−1</button>
                <span className="val">{bids[it.id]}</span>
                <button className="alloc-btn" onClick={() => { setRow(it.id, bids[it.id] + 1); tracker.recordChange(bids[it.id]) }} aria-label={t('take.btn_plus', { n: 1 })}>+1</button>
                <button className="alloc-btn" onClick={() => { setRow(it.id, bids[it.id] + 10); tracker.recordChange(bids[it.id]) }} aria-label={t('take.btn_plus', { n: 10 })}>+10</button>
              </div>
            </div>
            <div className="auction-bar"><div className="auction-bar-fill" style={{ width: `${(bids[it.id] / budget) * 100}%` }} /></div>
          </div>
        ))}
        <p className="question-hint small center mt">{t('take.auction_hint')}</p>
        <button className="btn-primary" style={{ marginTop: 32, display: 'block', width: '100%' }} onClick={confirm}>
          {t('common.confirm')}
        </button>
      </div>
    </div>
  )
}
