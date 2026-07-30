/**
 * 答题卡 —— 答题流侧边抽屉,展示全部题号网格,支持跳转与随机跳转。
 * 状态:已答(实色填充)/ 未答(描边)/ 当前题(高亮边框)/ 超时(虚线)。
 * 按 9 题型分组着色,便于用户识别题型分布。
 * 移动端从底部滑入,桌面端从右侧滑入。
 */
import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { play, vibrate } from '@/lib/audio'
import type { QuestionBank, Answer } from '@/lib/types'

interface AnswerSheetProps {
  open: boolean
  onClose: () => void
  bank: QuestionBank
  currentIdx: number
  answers: { answer?: Answer; _timeout?: boolean }[]
  onJump: (idx: number) => void
}

const TYPE_COLORS: Record<string, string> = {
  scale: 'var(--mirror-celebrity)',
  dilemma: 'var(--accent)',
  allocation: 'var(--mirror-value)',
  sort: 'var(--mirror-ideology)',
  iat: '#6b4a8b',
  slider: '#4a6b8b',
  forced_choice: '#8b4a6b',
  matrix: '#4a8b6b',
  auction: '#8b6b4a',
}

export function AnswerSheet({ open, onClose, bank, currentIdx, answers, onJump }: AnswerSheetProps) {
  const { t } = useI18n()

  // 按题型分组题号
  const groups = useMemo(() => {
    const m: Record<string, number[]> = {}
    bank.questions.forEach((q, i) => {
      ;(m[q.type] = m[q.type] || []).push(i)
    })
    return Object.entries(m)
  }, [bank])

  // 统计
  const stats = useMemo(() => {
    const answered = answers.filter((a) => a && (Object.keys(a.answer || {}).length > 0 || a._timeout)).length
    const timedOut = answers.filter((a) => a?._timeout).length
    return { answered, total: bank.questions.length, remaining: bank.questions.length - answered, timedOut }
  }, [answers, bank.questions.length])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 随机跳到一道未答的题
  const jumpRandom = () => {
    const unanswered: number[] = []
    bank.questions.forEach((_, i) => {
      const a = answers[i]
      if (!a || (Object.keys(a.answer || {}).length === 0 && !a._timeout)) unanswered.push(i)
    })
    if (unanswered.length === 0) {
      // 全答完了,随机跳一道已答的回顾
      const target = Math.floor(Math.random() * bank.questions.length)
      play('select'); vibrate(12)
      onJump(target); onClose()
      return
    }
    const target = unanswered[Math.floor(Math.random() * unanswered.length)]
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
          {/* 遮罩 */}
          <motion.div
            className="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* 抽屉面板 */}
          <motion.aside
            className="sheet-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('take.sheet_title')}
          >
            <header className="sheet-head">
              <div>
                <h2 className="sheet-title art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('take.sheet_title')}</h2>
                <p className="sheet-stats">
                  <span className="num">{stats.answered}</span> / {stats.total}
                  {stats.timedOut > 0 && <span className="sheet-timed"> · {t('take.sheet_timed', { n: stats.timedOut })}</span>}
                </p>
              </div>
              <button type="button" className="sheet-close" aria-label={t('common.exit')} onClick={onClose}>×</button>
            </header>

            {/* 进度条 */}
            <div className="sheet-progress">
              <div className="sheet-progress-fill" style={{ width: `${(stats.answered / stats.total) * 100}%` }} />
            </div>

            {/* 随机跳转按钮 */}
            <button type="button" className="sheet-random" onClick={jumpRandom}>
              <span className="sheet-random-icon">🎲</span>
              <span>{stats.remaining > 0 ? t('take.sheet_random', { n: stats.remaining }) : t('take.sheet_review')}</span>
            </button>

            {/* 题型图例 */}
            <div className="sheet-legend">
              {groups.map(([type]) => (
                <span className="sheet-legend-item" key={type}>
                  <span className="sheet-legend-dot" style={{ background: TYPE_COLORS[type] || 'var(--ink-ghost)' }} />
                  {t<string>(`take.type_label.${type}`)}
                </span>
              ))}
            </div>

            {/* 题号网格,按题型分组 */}
            <div className="sheet-groups">
              {groups.map(([type, indices]) => (
                <div className="sheet-group" key={type}>
                  <div className="sheet-group-head">
                    <span className="sheet-group-dot" style={{ background: TYPE_COLORS[type] || 'var(--ink-ghost)' }} />
                    <span className="sheet-group-name">{t<string>(`take.type_label.${type}`)}</span>
                    <span className="sheet-group-count">{indices.length}{t('common.questions')}</span>
                  </div>
                  <div className="sheet-grid">
                    {indices.map((idx) => {
                      const a = answers[idx]
                      const answered = !!(a && (Object.keys(a.answer || {}).length > 0 || a._timeout))
                      const timedOut = !!a?._timeout
                      const isCurrent = idx === currentIdx
                      return (
                        <motion.button
                          type="button"
                          key={idx}
                          className={`sheet-cell${answered ? ' answered' : ''}${timedOut ? ' timed' : ''}${isCurrent ? ' current' : ''}`}
                          style={answered ? { '--cell-color': TYPE_COLORS[type] || 'var(--ink-ghost)' } as React.CSSProperties : undefined}
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleJump(idx)}
                          aria-label={t('take.sheet_jump', { n: idx + 1 })}
                          aria-current={isCurrent ? 'true' : undefined}
                        >
                          {idx + 1}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <footer className="sheet-foot">
              <p>{t('take.sheet_hint')}</p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
