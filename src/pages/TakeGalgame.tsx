/**
 * Galgame 资历测评答题页 —— 霓虹赛博主题(独立于三面镜的宣纸水墨 Take.tsx)。
 *
 * 与 Take.tsx 的差异:
 * - 单一测评无路由参数,题库直接用 GALGAME_QUESTIONS
 * - 无草稿持久化 / 无行为轨迹 / 无倒计时(趣味向,无压力)
 * - 状态机精简为 intro → running → submitting
 * - 点击选项立即记录并 250ms 后自动进入下一题
 * - 主题走 [data-galgame="1"],样式用 .neon-take-* 前缀
 *
 * 完成提交:computeGalgameResult → base64 编码 → setLastResult → 跳 /report-galgame?r=
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
  GALGAME_QUESTIONS,
  GALGAME_DIM_ORDER,
  GALGAME_DIM_LABEL,
  galgameMeta,
  computeGalgameResult,
  type GalgameAnswer,
  type GalgameDim,
} from '@/data/galgame'

type Phase = 'intro' | 'running' | 'submitting'

/** 维度 → 霓虹色 CSS 变量(用于答题卡分组着色与维度标签) */
const DIM_VAR: Record<GalgameDim, string> = {
  experience: 'var(--neon-dim-experience)',
  genre: 'var(--neon-dim-genre)',
  aesthetic: 'var(--neon-dim-aesthetic)',
  narrative: 'var(--neon-dim-narrative)',
  meme: 'var(--neon-dim-meme)',
}

/** 答题卡抽屉(参考 AnswerSheet.tsx 交互,因类型不同而独立实现) */
interface SheetProps {
  open: boolean
  onClose: () => void
  currentIdx: number
  answers: (GalgameAnswer | null)[]
  onJump: (idx: number) => void
}

function GalgameSheet({ open, onClose, currentIdx, answers, onJump }: SheetProps) {
  // 按维度分组题号
  const groups = useMemo(() => {
    const m: Record<GalgameDim, number[]> = {
      experience: [], genre: [], aesthetic: [], narrative: [], meme: [],
    }
    GALGAME_QUESTIONS.forEach((q, i) => { m[q.dim].push(i) })
    return GALGAME_DIM_ORDER.map((dim) => ({ dim, indices: m[dim] }))
  }, [])

  const stats = useMemo(() => {
    const answered = answers.filter((a) => !!a).length
    return { answered, total: GALGAME_QUESTIONS.length, remaining: GALGAME_QUESTIONS.length - answered }
  }, [answers])

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
    const pool = unanswered.length > 0 ? unanswered : GALGAME_QUESTIONS.map((_, i) => i)
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
                  <span className="num">{stats.answered}</span> / {stats.total}
                </p>
              </div>
              <button type="button" className="neon-sheet-close" aria-label="关闭" onClick={onClose}>×</button>
            </header>

            <div className="neon-sheet-body">
              <button type="button" className="neon-sheet-random" onClick={jumpRandom}>
                <span aria-hidden="true">🎲</span>
                <span>{stats.remaining > 0 ? `随机跳未答 · 剩 ${stats.remaining}` : '随机回顾'}</span>
              </button>

              {groups.map(({ dim, indices }) => {
                const label = GALGAME_DIM_LABEL[dim]
                return (
                  <div className="neon-sheet-group" key={dim}>
                    <div className="neon-sheet-group-head" style={{ color: DIM_VAR[dim] }}>
                      <span className="neon-sheet-group-dot" />
                      <span className="neon-sheet-group-name">{label.zh} {label.en}</span>
                      <span className="neon-sheet-group-count">{indices.length}题</span>
                    </div>
                    <div className="neon-sheet-grid">
                      {indices.map((idx) => {
                        const answered = !!answers[idx]
                        const isCurrent = idx === currentIdx
                        return (
                          <motion.button
                            type="button"
                            key={idx}
                            className={`neon-sheet-cell${answered ? ' answered' : ''}${isCurrent ? ' current' : ''}`}
                            style={answered ? { '--cell-color': DIM_VAR[dim] } as React.CSSProperties : { color: DIM_VAR[dim] }}
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
                )
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default function TakeGalgame() {
  const navigate = useNavigate()
  useDocumentMeta({ page: 'take', vars: { name: galgameMeta.title } })

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<(GalgameAnswer | null)[]>(
    () => Array(GALGAME_QUESTIONS.length).fill(null),
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  // 镜像 ref,供稳定回调读取最新值
  const idxRef = useRef(currentIdx); idxRef.current = currentIdx
  const answersRef = useRef(answers); answersRef.current = answers
  const submittingRef = useRef(false)
  const advanceTimerRef = useRef<number | null>(null)

  const total = GALGAME_QUESTIONS.length
  const q = GALGAME_QUESTIONS[currentIdx]
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
  const recordAnswer = useCallback((optionId: string, score: number) => {
    const cur = idxRef.current
    const curQ = GALGAME_QUESTIONS[cur]
    if (!curQ) return
    play('select'); vibrate(12)
    const rec: GalgameAnswer = {
      question_id: curQ.id,
      option_id: optionId,
      score,
      dim: curQ.dim,
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
    if (idx < 0 || idx >= GALGAME_QUESTIONS.length) return
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
        const result = computeGalgameResult(answersRef.current.filter((a): a is GalgameAnswer => !!a))
        const share = btoa(unescape(encodeURIComponent(JSON.stringify({ type: 'galgame', result }))))
        useLastResultStore.getState().setLastResult(share)
        play('complete'); vibrate([20, 30, 20])
        navigate(`/report-galgame?r=${encodeURIComponent(share)}`)
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
      <TopBar sectionKey="nav.galgame" />
      <div className="neon-take-header">
        <span className="neon-take-title">GALGAME // 资历测评</span>
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
            <div className="neon-intro-eyebrow">NEON ASSESSMENT // v1.0</div>
            <h1
              className="neon-intro-title is-glitch"
              data-text="GALGAME 资历测评"
            >
              GALGAME 资历测评
            </h1>
            <p className="neon-intro-desc">{galgameMeta.description}</p>

            <div className="neon-intro-meta">
              <div className="neon-intro-meta-item">
                <div className="neon-intro-meta-num">{galgameMeta.question_count}</div>
                <div className="neon-intro-meta-label">题数 / Q</div>
              </div>
              <div className="neon-intro-meta-item">
                <div className="neon-intro-meta-num">{galgameMeta.estimated_minutes}</div>
                <div className="neon-intro-meta-label">分钟 / MIN</div>
              </div>
              <div className="neon-intro-meta-item">
                <div className="neon-intro-meta-num">5</div>
                <div className="neon-intro-meta-label">维度 / DIM</div>
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
              <span
                className="neon-dim-badge"
                style={{ color: DIM_VAR[q.dim] }}
              >
                {GALGAME_DIM_LABEL[q.dim].zh} {GALGAME_DIM_LABEL[q.dim].en}
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
                  <span style={{ color: 'var(--neon-text-faint)' }}>//</span>
                  <span style={{ color: DIM_VAR[q.dim] }}>{GALGAME_DIM_LABEL[q.dim].zh}</span>
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
                        onClick={() => recordAnswer(opt.id, opt.score)}
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
            <div className="neon-loading-text">生成资历报告…</div>
          </motion.div>
        )}
      </AnimatePresence>

      <GalgameSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentIdx={currentIdx}
        answers={answers}
        onJump={jumpTo}
      />
    </div>
  )
}
