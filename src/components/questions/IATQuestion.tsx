/**
 * 内隐联想(IAT) —— 注视点 → 词汇 → 左右分类,记录反应时(原 runIAT)。
 * 错答闪烁纠错不推进(仅首次错答记录一次);全词完成提交 iat reactions[]。
 * 自控节奏,不走单题倒计时。
 */
import { useEffect, useRef, useState } from 'react'
import type { IATQuestion as IATQ, IATReaction } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import type { QuestionProps } from './types'

export function IATQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<IATQ>) {
  const { t: _t } = useI18n()
  void _t
  const reactions = useRef<IATReaction[]>([])
  const wordStart = useRef(0)
  const canRespond = useRef(false)
  const currentErrored = useRef(false)
  const done = useRef(false)
  const [idx, setIdx] = useState(0)
  const [showFixation, setShowFixation] = useState(true)
  const [errorBtn, setErrorBtn] = useState<'left' | 'right' | null>(null)

  // 注视点 → 词汇流转
  useEffect(() => {
    if (idx >= q.words.length) {
      if (!done.current) {
        done.current = true
        getAnswerRef.current = () => ({ iat: reactions.current })
        onAnswer({ iat: reactions.current })
      }
      return
    }
    setShowFixation(true)
    canRespond.current = false
    const tmr = setTimeout(() => {
      setShowFixation(false)
      wordStart.current = performance.now()
      canRespond.current = true
      currentErrored.current = false
    }, 350)
    return () => clearTimeout(tmr)
  }, [idx, q.words.length, onAnswer, getAnswerRef])

  const classify = (side: 'left' | 'right') => {
    if (!canRespond.current || idx >= q.words.length) return
    const w = q.words[idx]
    const rt = performance.now() - wordStart.current
    const correct = w.category === side
    if (!correct) {
      setErrorBtn(side)
      setTimeout(() => setErrorBtn(null), 400)
      if (!currentErrored.current) {
        reactions.current.push({ word: w.word, category: w.category, response: side, rt: Math.round(rt), correct: false })
        currentErrored.current = true
      }
      return
    }
    reactions.current.push({ word: w.word, category: w.category, response: side, rt: Math.round(rt), correct: true })
    tracker.recordChange(rt)
    canRespond.current = false
    setIdx((i) => i + 1)
  }

  // 键盘 ← / →
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); classify('left') }
      if (e.key === 'ArrowRight') { e.preventDefault(); classify('right') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <p className="question-hint small center">凭直觉,越快越好</p>
      <div className="iat-area" data-q={q.id}>
        <div className="iat-labels">
          <span>← {q.left_label}</span>
          <span>{q.right_label} →</span>
        </div>
        <div className="iat-word" id="iat-word">
          {showFixation ? <span className="iat-fixation">+</span> : q.words[idx]?.word}
        </div>
        <div className="iat-buttons">
          <button className={`iat-btn${errorBtn === 'left' ? ' error' : ''}`} onClick={() => classify('left')}>{q.left_label}</button>
          <button className={`iat-btn${errorBtn === 'right' ? ' error' : ''}`} onClick={() => classify('right')}>{q.right_label}</button>
        </div>
        <div className="iat-progress">
          <span id="iat-progress">{Math.min(idx + 1, q.words.length)} / {q.words.length}</span>
        </div>
      </div>
    </div>
  )
}
