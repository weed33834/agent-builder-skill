/**
 * Galgame 角色画像测评答题页 —— 霓虹赛博主题，与资历测评同主题。
 *
 * 与 TakeGalgame 的差异:
 * - 12道题，匹配你与哪个Galgame角色最契合
 * - 无草稿持久化，点击选项立即记录并跳转下一题
 * - 完成后跳 /report-galgame-char?r=
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useDocumentMeta } from '@/lib/seo'
import { useI18n } from '@/lib/i18n'
import { play, vibrate } from '@/lib/audio'
import { useLastResultStore } from '@/store'
import { TopBar } from '@/components/layout/TopBar'
import {
  CHAR_QUESTIONS,
  GALGAME_CHARACTERS,
  computeCharacterMatch,
  type CharQuestion,
  type CharAnswer,
} from '@/data/galgame-characters'

type Phase = 'intro' | 'running' | 'submitting'

/** 答题卡抽屉 */
interface SheetProps {
  open: boolean
  onClose: () => void
  currentIdx: number
  answers: (CharAnswer | null)[]
  onJump: (idx: number) => void
}

function CharSheet({ open, onClose, currentIdx, answers, onJump }: SheetProps) {
  const answered = answers.filter((a) => !!a).length
  const total = CHAR_QUESTIONS.length

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 随机跳到一道未答题;全答完则随机回顾
  const jumpRandom = () => {
    const unanswered: number[] = []
    answers.forEach((a, i) => { if (!a) unanswered.push(i) })
    const pool = unanswered.length > 0 ? unanswered : CHAR_QUESTIONS.map((_, i) => i)
    const target = pool[Math.floor(Math.random() * pool.length)]
    play('select'); vibrate(12)
    onJump(target); onClose()
  }

  const handleJump = (idx: number) => {
    play('select'); vibrate(12)
    onJump(idx); onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="neon-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            className="neon-sheet-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label="答题卡"
          >
            <header className="neon-sheet-head">
              <div>
                <h2 className="neon-sheet-title">答题卡 / SHEET</h2>
                <p className="neon-sheet-stats">
                  <span className="num">{answered}</span> / {total}
                </p>
              </div>
              <button type="button" className="neon-sheet-close" aria-label="关闭" onClick={onClose}>×</button>
            </header>

            <div className="neon-sheet-body">
              <button type="button" className="neon-sheet-random" onClick={jumpRandom}>
                <span aria-hidden="true">🎲</span>
                <span>{answered < total ? `随机跳未答 · 剩 ${total - answered}` : '随机回顾'}</span>
              </button>

              <div className="neon-sheet-grid">
                {CHAR_QUESTIONS.map((_, idx) => {
                  const answered = !!answers[idx]
                  const isCurrent = idx === currentIdx
                  return (
                    <motion.button
                      type="button"
                      key={idx}
                      className={`neon-sheet-cell${answered ? ' answered' : ''}${isCurrent ? ' current' : ''}`}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleJump(idx)}
                      aria-label={`跳到第 ${idx + 1} 题`}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      {idx + 1}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default function TakeGalgameChar() {
  const navigate = useNavigate()
  useDocumentMeta({ page: 'take', vars: { name: 'Galgame 角色画像' } })

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<(CharAnswer | null)[]>(
    () => Array(CHAR_QUESTIONS.length).fill(null),
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  const idxRef = useRef(currentIdx); idxRef.current = currentIdx
  const answersRef = useRef(answers); answersRef.current = answers
  const submittingRef = useRef(false)
  const advanceTimerRef = useRef<number | null>(null)

  const total = CHAR_QUESTIONS.length
  const q = CHAR_QUESTIONS[currentIdx]
  const answeredCount = useMemo(() => answers.filter((a) => !!a).length, [answers])
  const allAnswered = answeredCount === total

  // 主题标记:挂载铺霓虹深色,卸载恢复
  useEffect(() => {
    document.body.dataset.galgame = '1'
    return () => { delete document.body.dataset.galgame }
  }, [])

  // 清理自动跳题的定时器
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
    }
  }, [])

  // 记录答案:立即写入 + 音效震动,250ms 后自动进入下一题
  const recordAnswer = useCallback((questionId: string, optionId: string, scores: Record<string, number>) => {
    const cur = idxRef.current
    const curQ = CHAR_QUESTIONS[cur]
    if (!curQ) return
    play('select'); vibrate(12)
    const rec: CharAnswer = {
      question_id: questionId,
      option_id: optionId,
      scores,
    }
    const next = [...answersRef.current]
    next[cur] = rec
    setAnswers(next)
    // 250ms 过渡后前进(末题前进到 total,触发提交)
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = window.setTimeout(() => {
      setCurrentIdx(cur + 1)
    }, 250)
  }, [])

  // 跳转(答题卡 / 导航)
  const jumpTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= CHAR_QUESTIONS.length) return
    if (advanceTimerRef.current) { window.clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null }
    setCurrentIdx(idx)
  }, [])

  const goPrev = useCallback(() => {
    if (idxRef.current > 0) jumpTo(idxRef.current - 1)
  }, [jumpTo])
  const goNext = useCallback(() => {
    if (idxRef.current < total - 1) jumpTo(idxRef.current + 1)
  }, [jumpTo, total])
  const goNextUnanswered = useCallback(() => {
    for (let step = 1; step <= total; step++) {
      const idx = (idxRef.current + step) % total
      if (!answersRef.current[idx]) { jumpTo(idx); return }
    }
  }, [jumpTo, total])

  // 全部答完 → 提交(800ms 处理动画)
  const submitAll = useCallback(() => {
    if (submittingRef.current) return
    submittingRef.current = true
    setPhase('submitting')
    play('submit')
    window.setTimeout(() => {
      try {
        const result = computeCharacterMatch(answersRef.current.filter((a): a is CharAnswer => !!a))
        const share = btoa(unescape(encodeURIComponent(JSON.stringify({ type: 'galgame-char', result }))))
        useLastResultStore.getState().setLastResult(share)
        play('complete'); vibrate([20, 30, 20])
        navigate(`/report-galgame-char?r=${encodeURIComponent(share)}`)
      } catch (e) {
        console.error(e)
        submittingRef.current = false
        setPhase('running')
      }
    }, 800)
  }, [navigate])

  // 自动提交触发:前进到 total 末尾
  useEffect(() => {
    if (phase === 'running' && currentIdx >= total) {
      submitAll()
    }
  }, [phase, currentIdx, total, submitAll])

  const startQuiz = () => {
    play('tap'); vibrate(12)
    setPhase('running')
  }

  const pct = total ? (answeredCount / total) * 100 : 0

  return (
    <div className="neon-take-wrap">
      <TopBar sectionKey="nav.galgame_char" />
      <div className="neon-take-header">
        <span className="neon-take-title">GALGAME // 角色画像</span>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            className="neon-intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <div className="neon-intro-eyebrow">NEON PROFILE // v1.0</div>
            <h1
              className="neon-intro-title is-glitch"
              data-text="Galgame 角色画像"
            >
              Galgame 角色画像
            </h1>
            <p className="neon-intro-desc">12道选择题，测出你的灵魂底色与哪个Galgame名角色最契合。命中注定就是ta。</p>

            <div className="neon-intro-meta">
              <div className="neon-intro-meta-item">
                <div className="neon-intro-meta-num">{CHAR_QUESTIONS.length}</div>
                <div className="neon-intro-meta-label">题数 / Q</div>
              </div>
              <div className="neon-intro-meta-item">
                <div className="neon-intro-meta-num">{GALGAME_CHARACTERS.length}</div>
                <div className="neon-intro-meta-label">角色 / CHR</div>
              </div>
              <div className="neon-intro-meta-item">
                <div className="neon-intro-meta-num">3</div>
                <div className="neon-intro-meta-label">分钟 / MIN</div>
              </div>
            </div>

            <button type="button" className="neon-btn" onClick={startQuiz}>
              开始测评 →
            </button>
          </motion.div>
        )}

        {phase === 'running' && q && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 进度条 */}
            <div className="neon-progress-track">
              <div className="neon-progress-fill" style={{ width: `${pct}%` }} data-full={allAnswered ? '1' : undefined} />
            </div>
            <div className="neon-progress-text">
              <span className="neon-q-num">
                <span className="num cur">{String(currentIdx + 1).padStart(2, '0')}</span>
                {' '}/{' '}{String(total).padStart(2, '0')}
              </span>
              <button
                type="button"
                className="neon-sheet-trigger"
                onClick={() => setSheetOpen(true)}
                aria-label="打开答题卡"
                title="答题卡"
              >
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </button>
            </div>

            {/* 题目卡(逐题切换动画) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                className="neon-q-card"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="neon-q-meta">
                  <span className="neon-q-num">
                    Q<span className="cur">{String(currentIdx + 1).padStart(2, '0')}</span>
                  </span>
                </div>
                <span className="neon-corner-bl" aria-hidden="true" />
                <h2 className="neon-q-prompt">{q.prompt}</h2>
                <div className="neon-option-list">
                  {q.options.map((opt) => {
                    const picked = answers[currentIdx]?.option_id === opt.id
                    return (
                      <motion.button
                        type="button"
                        key={opt.id}
                        className={`neon-option${picked ? ' is-selected' : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => recordAnswer(q.id, opt.id, opt.scores)}
                        disabled={!!answers[currentIdx] && advanceTimerRef.current !== null}
                      >
                        <span className="neon-option-mark">{opt.id.toUpperCase()}</span>
                        <span className="neon-option-text">{opt.text}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 底部导航 */}
            <div className="neon-nav">
              <button
                type="button"
                className="neon-nav-btn"
                onClick={goPrev}
                disabled={currentIdx === 0}
              >
                ← 上一题
              </button>
              {allAnswered ? (
                <button
                  type="button"
                  className="neon-nav-btn is-submit"
                  onClick={submitAll}
                >
                  查看报告 →
                </button>
              ) : (
                <button
                  type="button"
                  className="neon-nav-btn is-primary"
                  onClick={goNextUnanswered}
                >
                  下一未答
                </button>
              )}
              <button
                type="button"
                className="neon-nav-btn"
                onClick={goNext}
                disabled={currentIdx >= total - 1}
              >
                下一题 →
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'submitting' && (
          <motion.div
            key="submitting"
            className="neon-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="neon-loading-spinner" />
            <div className="neon-loading-text">匹配角色画像…</div>
          </motion.div>
        )}
      </AnimatePresence>

      <CharSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentIdx={currentIdx}
        answers={answers}
        onJump={jumpTo}
      />
    </div>
  )
}
