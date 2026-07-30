/**
 * 首页 —— 复刻原 index.html:hero 分栏 + 三镜卡 + 今日认识 + 三步引导。
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { qk, fetchCelebrities } from '@/lib/query'
import { Button } from '@/components/ui/Button'
import { FigureCard } from '@/components/ui/FigureCard'
import { asset } from '@/lib/utils'
import type { Celebrity } from '@/lib/types'

type MirrorRes = { icon: string; title: string; tagline: string; desc: string }
const HOWTO_NUMS = ['壹', '贰', '叁']

export default function Home() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'home' })
  const { data: figures, isLoading } = useQuery({ queryKey: qk.celebrities(), queryFn: fetchCelebrities })

  const today: Celebrity[] =
    figures && figures.length
      ? [0, 1, 2].map((i) => figures[(Math.floor(Date.now() / 86400000) * 3 + i) % figures.length])
      : []

  return (
    <div className="container">
      <header className="hero">
        <div className="hero-grid">
          <div className="hero-text">
            <p className="hero-eyebrow">MIND MIRROR · 自我探索</p>
            <h1>{t('home.brand')}</h1>
            <p className="hero-lede">{t('home.hero_lede')}</p>
            <div className="hero-cta">
              <Button to="/take/celebrity">{t('home.start_cta')}</Button>
              <Button variant="secondary" to="/about">{t('home.about_cta')}</Button>
            </div>
            <p className="hero-trust">{t('home.hero_trust')}</p>
          </div>
          <div className="hero-visual">
            <img src={asset('/images/hero-mirror.svg')} className="hero-mirror-img" width={320} height={320} alt="" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-divider"><span /></div>
        <p className="disclaimer">{t('home.disclaimer')}</p>
      </header>

      <main>
        <div className="mirrors-grid">
          {assessments.map((a) => {
            const m = t<MirrorRes>(`home.mirrors.${a.type}`)
            return (
              <Link key={a.type} to={`/take/${a.type}`} className="mirror-card" data-type={a.type}>
                <div className="card-icon">
                  <img src={asset(`/images/mirror-${a.type}.svg`)} className="mirror-card-icon" width={48} height={48} alt="" />
                </div>
                <h2>{m.title}</h2>
                <p className="tagline">{m.tagline}</p>
                <p className="desc">{m.desc}</p>
                <div className="meta">
                  <span><span className="num">{a.question_count}</span> {t('common.questions')}</span>
                  <span><span className="num">{a.estimated_minutes}</span> {t('common.minutes')}</span>
                </div>
                <div className="start-hint">{t('home.enter')}</div>
              </Link>
            )
          })}
        </div>

        <section className="onthisday-section">
          <div className="onthisday-head">
            <h2>{t('home.onthisday_title')}</h2>
            <p>{t('home.onthisday_sub')}</p>
          </div>
          <div className="onthisday-grid">
            {isLoading ? (
              <div className="history-loading">
                <div className="mirror-disc" />
                <p>{t('common.loading')}</p>
              </div>
            ) : (
              <>
                {today.map((f) => <FigureCard key={f.id} figure={f} />)}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <Link to="/figures" className="onthisday-more">{t('home.figures.view_all_cta')}</Link>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="howto-steps" aria-label="使用步骤">
          {HOWTO_NUMS.map((num, i) => {
            const n = i + 1
            return (
              <div className="howto-step" key={n}>
                <div className="howto-step-num">{num}</div>
                <div className="howto-step-label">{t(`home.howto_${n}_label`)}</div>
                <div className="howto-step-desc">{t(`home.howto_${n}_desc`)}</div>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
