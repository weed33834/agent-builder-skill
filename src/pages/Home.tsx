/**
 * 首页 —— 杂志风格排版 Redesign
 * 黑白色调，大胆排版，高对比度，干净利落的编辑式布局。
 * 使用 data-theme="editorial" 主题变量。
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { categories } from '@/data/categories'
import { getDailyQuote } from '@/data/daily'

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.6, ease: EASE },
} as const

export default function Home() {
  const { t } = useI18n()
  const helmet = useDocumentMeta({ page: 'home' })
  const quote = getDailyQuote()

  return (
    <>
      {helmet}
      <div className="home-editorial" data-theme="editorial">

        {/* ===== Hero ===== */}
        <header className="ed-hero">
          <div className="ed-hero-content">
            <motion.p
              className="ed-hero-eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5, ease: EASE }}
            >
              MIND MIRROR · 自我探索
            </motion.p>

            <motion.h1
              className="ed-hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
            >
              <span className="ed-hero-brand">心镜</span>
              <span className="ed-hero-brand-en">MindMirror</span>
            </motion.h1>

            <motion.p
              className="ed-hero-tagline"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
            >
              {t('home.hero_lede')}
            </motion.p>

            <motion.div
              className="ed-hero-actions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
            >
              <Link to="/sections" className="btn btn-primary btn-lg">{t('home.start_cta')}</Link>
              <Link to="/about" className="btn btn-ghost btn-lg">{t('home.about_cta')}</Link>
            </motion.div>

            <motion.p
              className="ed-hero-trust"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {t('home.hero_trust')}
            </motion.p>
          </div>
        </header>

        <main>
          {/* ===== Featured Categories ===== */}
          <section className="ed-section ed-featured">
            <div className="ed-section-head">
              <motion.span
                className="ed-section-tag"
                {...fadeUp}
                transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
              >
                探索板块
              </motion.span>
              <motion.h2
                className="ed-section-title"
                {...fadeUp}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
              >
                选择你的镜
              </motion.h2>
              <motion.p
                className="ed-section-desc"
                {...fadeUp}
                transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
              >
                每个板块都是一扇独立的门——选一扇，走进去看你自己。
              </motion.p>
            </div>

            <div className="ed-featured-grid">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  className="ed-domain-card card"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: EASE }}
                  whileHover={{ y: -6 }}
                >
                  <div className="ed-domain-card-inner">
                    <span className="ed-domain-number">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="ed-domain-title">{cat.title}</h3>
                    <p className="ed-domain-subtitle">{cat.subtitle}</p>
                    <p className="ed-domain-desc">{cat.desc}</p>
                    <div className="ed-domain-tags">
                      {cat.assessments.map((a) => {
                        const meta = assessments.find((m) => m.type === a)
                        return meta ? <span key={a} className="tag">{meta.title}</span> : null
                      })}
                      {!cat.available && <span className="tag">即将推出</span>}
                    </div>
                    {cat.available ? (
                      <Link to={`/section/${cat.id}`} className="ed-domain-link">
                        进入板块 <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <span className="ed-domain-link disabled">
                        敬请期待
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ===== Daily Quote ===== */}
          <section className="ed-section ed-quote">
            <motion.blockquote
              className="ed-quote-block"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="ed-quote-mark" aria-hidden="true">&ldquo;</span>
              <p className="ed-quote-text">{quote.text}</p>
              <footer className="ed-quote-footer">
                <cite className="ed-quote-author">{quote.author}</cite>
                {quote.source && <span className="ed-quote-source">{quote.source}</span>}
              </footer>
            </motion.blockquote>
          </section>

          {/* ===== Popular Assessments ===== */}
          <section className="ed-section ed-popular">
            <div className="ed-section-head">
              <motion.span
                className="ed-section-tag"
                {...fadeUp}
                transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
              >
                热门测评
              </motion.span>
              <motion.h2
                className="ed-section-title"
                {...fadeUp}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
              >
                三面镜子，照见真我
              </motion.h2>
              <motion.p
                className="ed-section-desc"
                {...fadeUp}
                transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
              >
                以情境化答题与行为轨迹，看见你在历史长河与价值坐标中的真实投影。
              </motion.p>
            </div>

            <div className="ed-popular-grid">
              {assessments.map((a, i) => {
                const m = t<{ icon: string; title: string; tagline: string; desc: string }>(`home.mirrors.${a.type}`)
                return (
                  <motion.div
                    key={a.type}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: EASE }}
                    whileHover={{ y: -4 }}
                  >
                    <Link to={`/take/${a.type}`} className="ed-assessment-card card">
                      <div className="ed-assessment-body">
                        <span className="ed-assessment-icon">{m.icon}</span>
                        <h3 className="ed-assessment-title">{m.title}</h3>
                        <p className="ed-assessment-tagline">{m.tagline}</p>
                        <p className="ed-assessment-desc">{m.desc}</p>
                        <div className="ed-assessment-meta">
                          <span className="tag">{a.question_count} 题</span>
                          <span className="tag">{a.estimated_minutes} 分钟</span>
                        </div>
                      </div>
                      <div className="ed-assessment-cta">
                        <span>开始测评</span>
                        <span className="ed-arrow" aria-hidden="true">→</span>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* ===== Footer CTA ===== */}
          <section className="ed-section ed-footer-cta">
            <motion.div
              className="ed-footer-cta-inner"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <p className="ed-footer-cta-text">{t('home.disclaimer')}</p>
              <Link to="/sections" className="btn btn-primary btn-lg">{t('home.start_cta')}</Link>
            </motion.div>
          </section>
        </main>
      </div>
    </>
  )
}