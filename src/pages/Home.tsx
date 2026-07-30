/**
 * 首页 —— 复刻原 index.html:hero 分栏 + 三镜卡 + 今日认识 + 三步引导。
 * 增强:艺术字体大标题 + SVG 装饰填补空白 + 微动效。
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
import {
  InkBlot,
  TrinityMirror,
  FloatingParticles,
  BrushStroke,
  ScrollDivider,
  SealStamp,
  ConcentricRings,
} from '@/components/ui/Ornaments'
import { InkCanvas } from '@/components/ui/InkCanvas'

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
      <header className="hero" style={{ position: 'relative', overflow: 'visible' }}>
        {/* 飘墨粒子背景动画 */}
        <InkCanvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.7, zIndex: 0 }} particleCount={16} />
        {/* 水墨晕染背景装饰 */}
        <InkBlot style={{ position: 'absolute', top: '-40px', right: '-60px', width: '380px', height: '380px', pointerEvents: 'none', opacity: 0.5, zIndex: 0 }} />
        <InkBlot color="var(--mirror-ideology)" style={{ position: 'absolute', bottom: '20px', left: '-80px', width: '260px', height: '260px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-text">
            <p className="hero-eyebrow">MIND MIRROR · 自我探索</p>
            <h1 className="art-title">{t('home.brand')}</h1>
            <p className="hero-title-en">Mind · Mirror · Mirror of Mind</p>
            <p className="hero-lede">{t('home.hero_lede')}</p>
            <div className="hero-cta">
              <Button to="/take/celebrity">{t('home.start_cta')}</Button>
              <Button variant="secondary" to="/about">{t('home.about_cta')}</Button>
            </div>
            <p className="hero-trust">{t('home.hero_trust')}</p>
            {/* 飘带装饰 */}
            <BrushStroke style={{ width: '220px', height: '24px', marginTop: '24px', opacity: 0.5 }} />
          </div>
          <div className="hero-visual" style={{ position: 'relative' }}>
            {/* 同心圆装饰,填充右侧空白 */}
            <ConcentricRings color="var(--mirror-celebrity)" style={{ position: 'absolute', top: '-20px', left: '-20px', width: '120px', height: '120px', opacity: 0.4, pointerEvents: 'none' }} />
            <img src={asset('/images/hero-mirror.svg')} className="hero-mirror-img" width={320} height={320} alt="" aria-hidden="true" />
            {/* 浮动粒子,营造氛围 */}
            <FloatingParticles color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '-10px', width: '180px', height: '120px', pointerEvents: 'none', opacity: 0.6 }} />
            {/* 落款印章 */}
            <SealStamp char="照" style={{ position: 'absolute', bottom: '20px', right: '20px', width: '52px', height: '52px', opacity: 0.7 }} />
          </div>
        </div>
        <div className="hero-divider"><span /></div>
        <p className="disclaimer">{t('home.disclaimer')}</p>
      </header>

      <main>
        {/* 装饰条:三镜合一符号 */}
        <div style={{ textAlign: 'center', margin: '8px 0 32px', opacity: 0.7 }}>
          <TrinityMirror style={{ width: '160px', height: '60px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '11px', color: 'var(--ink-faint)', letterSpacing: '0.35em', marginTop: '6px', textTransform: 'uppercase' }}>Three Mirrors · 三镜合一</div>
        </div>

        <div className="mirrors-grid">
          {assessments.map((a, i) => {
            const m = t<MirrorRes>(`home.mirrors.${a.type}`)
            const numCN = ['壹', '贰', '叁'][i] || ''
            return (
              <Link key={a.type} to={`/take/${a.type}`} className="mirror-card" data-type={a.type}>
                <span className="mirror-card-num">No.{String(i + 1).padStart(2, '0')}</span>
                <div className="card-icon">
                  <img src={asset(`/images/mirror-${a.type}.svg`)} className="mirror-card-icon" width={48} height={48} alt="" />
                </div>
                {/* 角标艺术字 */}
                <span className="art-seal" style={{ position: 'absolute', top: '48px', right: '20px', fontSize: '22px', color: 'var(--mirror)', opacity: 0.5 }}>{numCN}</span>
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

        {/* 卷轴分隔装饰 */}
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <ScrollDivider style={{ width: '280px', height: '16px' }} />
        </div>

        <section className="onthisday-section">
          <div className="onthisday-head">
            <h2 className="art-title" style={{ fontSize: '26px' }}>{t('home.onthisday_title')}</h2>
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
                <div className="howto-step-num art-brush" style={{ fontSize: '24px' }}>{num}</div>
                <div className="howto-step-label art-title">{t(`home.howto_${n}_label`)}</div>
                <div className="howto-step-desc">{t(`home.howto_${n}_desc`)}</div>
              </div>
            )
          })}
        </section>

        {/* 底部装饰条 */}
        <div className="deco-strip" aria-hidden="true">
          <span className="deco-strip-dot" />
          <span className="deco-strip-line" />
          <span className="deco-strip-diamond" />
          <span className="deco-strip-line" />
          <span className="deco-strip-dot" />
        </div>
      </main>
    </div>
  )
}
