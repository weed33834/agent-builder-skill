/**
 * 首页 —— 视觉重构:分层水墨背景 + motion 入场动画 + 装饰微动效。
 * 美学延续宣纸 × 墨 × 朱墨,三镜三色(旧铜/青石/钢蓝)。
 * 动画用 transform/opacity,尊重 prefers-reduced-motion(MotionConfig)。
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, MotionConfig } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { qk, fetchCelebrities } from '@/lib/query'
import { Button } from '@/components/ui/Button'
import { FigureCard } from '@/components/ui/FigureCard'
import { DailyPanel } from '@/components/ui/DailyPanel'
import { asset } from '@/lib/utils'
import type { Celebrity } from '@/lib/types'
import { MountainLayers } from '@/components/ui/Ornaments'

type MirrorRes = { icon: string; title: string; tagline: string; desc: string }
const HOWTO_NUMS = ['壹', '贰', '叁']

// 缓动常量 —— 与设计 token --ease 对齐
const EASE = [0.22, 1, 0.36, 1] as const
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const

// 入场动画公共配置
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
} as const

export default function Home() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'home' })
  const { data: figures, isLoading } = useQuery({ queryKey: qk.celebrities(), queryFn: fetchCelebrities })

  const today: Celebrity[] =
    figures && figures.length
      ? [0, 1, 2].map((i) => figures[(Math.floor(Date.now() / 86400000) * 3 + i) % figures.length])
      : []

  const brand = t<string>('home.brand')

  return (
    <MotionConfig reducedMotion="user">
      <div className="container home-container">

        {/* ===== Hero 区 ===== */}
        <header className="hero" style={{ position: 'relative', overflow: 'visible' }}>
          <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
            <div className="hero-text">
              <motion.p className="hero-eyebrow" {...fadeUp} transition={{ delay: 0.05, duration: 0.5, ease: EASE }}>
                MIND MIRROR · 自我探索
              </motion.p>

              <motion.h1
                className="art-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
                aria-label={brand}
              >
                {brand.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: EASE }}
                    style={{ display: 'inline-block' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.h1>

              <motion.p className="hero-title-en" {...fadeUp} transition={{ delay: 0.45, duration: 0.5, ease: EASE }}>
                Mind · Mirror · Mirror of Mind
              </motion.p>

              <motion.p className="hero-lede" {...fadeUp} transition={{ delay: 0.55, duration: 0.5, ease: EASE }}>
                {t('home.hero_lede')}
              </motion.p>

              <motion.div className="hero-cta" {...fadeUp} transition={{ delay: 0.65, duration: 0.5, ease: EASE }}>
                <Button to="/sections">{t('home.start_cta')}</Button>
                <Button variant="secondary" to="/about">{t('home.about_cta')}</Button>
              </motion.div>

              <motion.p className="hero-trust" {...fadeUp} transition={{ delay: 0.75, duration: 0.5, ease: EASE }}>
                {t('home.hero_trust')}
              </motion.p>
            </div>

            <div className="hero-visual" style={{ position: 'relative' }}>
              {/* hero-mirror:高清水墨镜面图 */}
              <motion.img
                src={asset('/images/hero-mirror.jpg')}
                className="hero-mirror-img"
                width={320}
                height={320}
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -10, 0],
                }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.3 },
                  scale: { duration: 0.6, delay: 0.3 },
                  y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                }}
              />
            </div>
          </div>

          <motion.div className="hero-divider" {...fadeUp} transition={{ delay: 0.8, duration: 0.5, ease: EASE }}>
            <span />
          </motion.div>
          <motion.p className="disclaimer" {...fadeUp} transition={{ delay: 0.85, duration: 0.5, ease: EASE }}>
            {t('home.disclaimer')}
          </motion.p>
        </header>

        <main style={{ position: 'relative', zIndex: 1 }}>
          {/* 三镜卡片 */}
          <div className="mirrors-grid">
            {assessments.map((a, i) => {
              const m = t<MirrorRes>(`home.mirrors.${a.type}`)
              const numCN = ['壹', '贰', '叁'][i] || ''
              return (
                <motion.div
                  key={a.type}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: EASE }}
                  whileHover={{ y: -5 }}
                  style={{ height: '100%' }}
                >
                  <Link to={`/take/${a.type}`} className="mirror-card" data-type={a.type} style={{ animation: 'none', height: '100%' }}>
                    <span className="mirror-card-num">No.{String(i + 1).padStart(2, '0')}</span>
                    <div className="card-icon">
                      <img src={asset(`/images/mirror-${a.type}.jpg`)} className="mirror-card-icon" width={48} height={48} alt="" />
                    </div>
                    <h2>{m.title}</h2>
                    <p className="tagline">{m.tagline}</p>
                    <p className="desc">{m.desc}</p>
                    <div className="meta">
                      <span><span className="num">{a.question_count}</span> {t('common.questions')}</span>
                      <span><span className="num">{a.estimated_minutes}</span> {t('common.minutes')}</span>
                    </div>
                    <div className="start-hint">
                      {t('home.enter')}
                      <span className="start-hint-arrow" aria-hidden="true">→</span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* 今日认识区 */}
          <section className="onthisday-section">
            <div className="onthisday-head">
              <motion.div
                className="section-title-deco"
                {...fadeUp}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
              >
                <span className="title-deco-line" aria-hidden="true" />
                <h2 className="art-title" style={{ fontSize: '26px' }}>{t('home.onthisday_title')}</h2>
                <span className="title-deco-line" aria-hidden="true" />
              </motion.div>
              <motion.p
                {...fadeUp}
                transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
              >
                {t('home.onthisday_sub')}
              </motion.p>
            </div>
            <div className="onthisday-grid">
              {isLoading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="onthisday-card skeleton-card" aria-hidden="true">
                      <div className="skeleton-portrait" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {today.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: EASE }}
                      style={{ height: '100%' }}
                    >
                      <FigureCard figure={f} />
                    </motion.div>
                  ))}
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <Link to="/figures" className="onthisday-more">{t('home.figures.view_all_cta')}</Link>
                  </div>
                </>
              )}
            </div>
          </section>

          <DailyPanel />

          {/* 三步引导区 */}
          <section className="howto-steps" aria-label="使用步骤">
            {HOWTO_NUMS.map((num, i) => {
              const n = i + 1
              return (
                <motion.div
                  className="howto-step"
                  key={n}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5, ease: EASE }}
                >
                  <div className="howto-step-num-wrap" aria-hidden="true">
                    <span className="howto-step-halo" />
                    <span className="howto-step-num art-brush" style={{ fontSize: '32px' }}>{num}</span>
                  </div>
                  <div className="howto-step-label art-title">{t(`home.howto_${n}_label`)}</div>
                  <div className="howto-step-desc">{t(`home.howto_${n}_desc`)}</div>
                  {/* 步骤间连接线(最后一步不显示) */}
                  {i < HOWTO_NUMS.length - 1 && (
                    <span className="howto-step-connector" aria-hidden="true" />
                  )}
                </motion.div>
              )
            })}
          </section>

          {/* 底部远山淡影 */}
          <MountainLayers style={{ width: '100%', maxWidth: '880px', height: '60px', margin: '0 auto', display: 'block', opacity: 0.3 }} />
        </main>
      </div>
    </MotionConfig>
  )
}
