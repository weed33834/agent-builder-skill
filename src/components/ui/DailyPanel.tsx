/**
 * 每日动态内容 —— 每日一言 + 历史上的今天。
 * 纯前端按日期种子轮换,静态站点也每日更新,用于首页填补空白、增加动态内容。
 * 左栏名言可「换一条」随机切换,右栏列出当日历史事件,均带 Motion 入场与 stagger。
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useI18n, langTag } from '@/lib/i18n'
import { getDailyQuote, getHistoryToday, DAILY_QUOTES } from '@/data/daily'
import { BrushStroke, ScrollDivider, SealStamp, InkBlot } from '@/components/ui/Ornaments'

const EASE = [0.22, 1, 0.36, 1] as const

export function DailyPanel() {
  const { t, lang } = useI18n()
  const [quote, setQuote] = useState(() => getDailyQuote())
  const events = getHistoryToday()
  const shown = events.slice(0, 3)

  const refresh = () => {
    if (DAILY_QUOTES.length <= 1) return
    let next = quote
    let guard = 0
    while (next.text === quote.text && guard < 16) {
      next = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)]
      guard++
    }
    setQuote(next)
  }

  const dateStr = new Intl.DateTimeFormat(langTag(lang), { month: 'long', day: 'numeric' }).format(new Date())

  return (
    <motion.section
      className="daily-section"
      aria-label={t('daily.title')}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="daily-head">
        <h2 className="art-title daily-title">{t('daily.title')}</h2>
        <p className="daily-subtitle">{t('daily.subtitle')}</p>
        <BrushStroke style={{ width: '200px', height: '20px', opacity: 0.5, margin: '12px auto 0' }} />
      </div>

      <div className="daily-grid">
        {/* 每日一言 */}
        <motion.article
          className="daily-quote-card"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          whileHover={{ y: -4 }}
        >
          <InkBlot style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', pointerEvents: 'none', opacity: 0.35, zIndex: 0 }} />
          <SealStamp char="言" style={{ position: 'absolute', bottom: '14px', right: '16px', width: '40px', height: '40px', opacity: 0.45, pointerEvents: 'none', zIndex: 0 }} />
          <span className="daily-quote-mark" aria-hidden="true">「</span>

          <p className="daily-quote-label">{t('daily.quote_label')}</p>

          <AnimatePresence mode="wait">
            <motion.blockquote
              key={quote.text}
              className="daily-quote-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {quote.text}
            </motion.blockquote>
          </AnimatePresence>

          <div className="daily-quote-meta">
            <span className="daily-quote-author">{quote.author}</span>
            <span className="daily-quote-source">{quote.source ?? t('daily.no_source')}</span>
          </div>

          <button type="button" className="daily-refresh-btn" onClick={refresh}>
            {t('daily.refresh')}
          </button>
        </motion.article>

        {/* 历史上的今天 */}
        <motion.article
          className="daily-history-card"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
          whileHover={{ y: -4 }}
        >
          <InkBlot color="var(--mirror)" style={{ position: 'absolute', bottom: '-60px', left: '-50px', width: '200px', height: '200px', pointerEvents: 'none', opacity: 0.25, zIndex: 0 }} />

          <div className="daily-history-head">
            <span className="daily-history-label">{t('daily.history_label')}</span>
            <span className="daily-date">{dateStr}</span>
          </div>
          <span className="daily-event-count">{t('daily.event_count', { n: events.length })}</span>

          <ul className="daily-event-list">
            {shown.map((ev, i) => (
              <motion.li
                key={`${ev.year}-${i}`}
                className="daily-event-item"
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.45, ease: EASE }}
              >
                <span className="daily-event-year">{ev.year}</span>
                {ev.tag && <span className="daily-event-tag">{ev.tag}</span>}
                <p className="daily-event-text">{ev.text}</p>
              </motion.li>
            ))}
          </ul>
        </motion.article>
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <ScrollDivider style={{ width: '260px', height: '14px', opacity: 0.55 }} />
      </div>
    </motion.section>
  )
}
