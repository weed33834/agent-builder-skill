/**
 * 关于页 —— 复刻原 about.html:6 节(理念/三镜/九法/行为/隐私/边界)+ 印章 + 回首页。
 * 增强:艺术字体标题 + 卡片化布局 + 装饰组件 + 书法引言。
 */
import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { asset } from '@/lib/utils'
import {
  InkBlot,
  TrinityMirror,
  MountainRange,
  ScrollDivider,
  SealStamp,
  RoundSeal,
  BrushStroke,
  CornerFlourish,
  CalligraphyColumn,
} from '@/components/ui/Ornaments'
import { InkCanvas } from '@/components/ui/InkCanvas'

type MirrorListItem = { icon: string; title: string; desc: string }
type MethodItem = { name: string; en: string; desc: string }
const MIRROR_TYPES = ['celebrity', 'value', 'ideology'] as const
const MIRROR_NUMS = ['壹', '贰', '叁']
const MIRROR_EN = ['CELEBRITY', 'VALUE', 'IDEOLOGY']

export default function About() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'about' })
  const mirrors = t<MirrorListItem[]>('about.mirrors')
  const methods = t<MethodItem[]>('about.methods')

  return (
    <div className="container">
      <div className="take-header">
        <Link to="/" className="back-link">{t('common.back')}</Link>
        <span className="title-label">{t('common.about_brand')}</span>
      </div>

      <header className="hero" style={{ position: 'relative', overflow: 'visible' }}>
        <InkCanvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.6, zIndex: 0 }} particleCount={12} />
        <InkBlot style={{ position: 'absolute', top: '-40px', right: '-60px', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.4, zIndex: 0 }} />
        <div className="mirror-disc" style={{ position: 'relative', zIndex: 1 }} />
        <h1 className="art-title" style={{ position: 'relative', zIndex: 1 }}>{t('home.brand')}</h1>
        <p className="subtitle" style={{ position: 'relative', zIndex: 1 }}>{t('home.subtitle')}</p>
        <div className="hero-divider"><span /></div>
        <p className="disclaimer">{t('home.disclaimer')}</p>

        {/* 书法竖排装饰,填补左右空白 */}
        <CalligraphyColumn chars={['心', '如', '明', '镜']} style={{ position: 'absolute', top: '20px', left: '-20px', width: '40px', height: '140px', opacity: 0.5, pointerEvents: 'none' }} />
        <CalligraphyColumn chars={['照', '见', '自', '己']} color="var(--mirror-value)" style={{ position: 'absolute', top: '20px', right: '-20px', width: '40px', height: '140px', opacity: 0.5, pointerEvents: 'none' }} />
      </header>

      <main>
        {/* 顶部装饰:三镜合一 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <TrinityMirror style={{ width: '160px', height: '60px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '11px', color: 'var(--ink-faint)', letterSpacing: '0.32em', marginTop: '6px', textTransform: 'uppercase' }}>Three Mirrors in One</div>
        </div>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <img className="about-section-icon" src={asset('/images/hero-mirror.svg')} alt="" />
            <h2 className="about-section-title art-title">{t('about.sec_concept')}</h2>
          </div>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.concept_body') }} />
          {/* 书法引言装饰 */}
          <div className="about-quote art-brush">以镜照心 · 以心见己</div>
          <CornerFlourish style={{ position: 'absolute', top: '12px', right: '12px', width: '40px', height: '40px', opacity: 0.4, pointerEvents: 'none' }} />
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <img className="about-section-icon" src={asset('/images/mirror-celebrity.svg')} alt="" />
            <h2 className="about-section-title art-title">{t('about.sec_mirrors')}</h2>
          </div>
          <ul className="mirror-list">
            {mirrors.map((m, i) => (
              <li key={i} style={{ borderLeftColor: `var(--mirror-${MIRROR_TYPES[i]})` }}>
                <span className="mirror-list-num">{MIRROR_NUMS[i]}</span>
                <span className="mirror-list-icon" style={{ borderColor: `var(--mirror-${MIRROR_TYPES[i]})` }}>
                  <img src={asset(`/images/mirror-${MIRROR_TYPES[i]}.svg`)} alt={m.title} width={32} height={32} />
                </span>
                <div>
                  <div className="mirror-list-title">
                    <span className="art-title">{m.title}</span>
                    <span className="mirror-list-title-en">{MIRROR_EN[i]}</span>
                  </div>
                  <div className="mirror-list-desc">{m.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <img className="about-section-icon" src={asset('/images/methods/scale.svg')} alt="" />
            <h2 className="about-section-title art-title">{t('about.sec_methods')}</h2>
          </div>
          <div className="method-grid">
            {methods.map((m, i) => (
              <div className="method-card" key={m.en}>
                <span className="method-num">No.{String(i + 1).padStart(2, '0')}</span>
                <div className="method-icon-wrap">
                  <img
                    src={asset(`/images/methods/${m.en.toLowerCase().replace(/\s+/g, '_')}.svg`)}
                    alt=""
                  />
                </div>
                <div className="method-name">{m.name}</div>
                <div className="method-en">{m.en}</div>
                <div className="method-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 卷轴分隔装饰 */}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <ScrollDivider style={{ width: '280px', height: '16px' }} />
        </div>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <img className="about-section-icon" src={asset('/images/methods/sort.svg')} alt="" />
            <h2 className="about-section-title art-title">{t('about.sec_behavior')}</h2>
          </div>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.behavior_body') }} />
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <img className="about-section-icon" src={asset('/images/seal.svg')} alt="" />
            <h2 className="about-section-title art-title">{t('about.sec_privacy')}</h2>
          </div>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.privacy_body') }} />
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <img className="about-section-icon" src={asset('/images/mountains.svg')} alt="" />
            <h2 className="about-section-title art-title">{t('about.sec_boundary')}</h2>
          </div>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.boundary_body') }} />
          {/* 远山淡影装饰 */}
          <MountainRange style={{ width: '100%', maxWidth: '400px', height: '60px', margin: '32px auto 0', display: 'block' }} />
        </section>

        {/* 底部装饰:飘带 + 印章 */}
        <div style={{ textAlign: 'center', margin: '40px 0 16px' }}>
          <BrushStroke style={{ width: '220px', height: '24px', opacity: 0.6 }} />
        </div>
        <div className="section-seal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <RoundSeal char="心" style={{ width: '48px', height: '48px', opacity: 0.8 }} />
          <img src={asset('/images/seal.svg')} alt="" aria-hidden="true" style={{ width: '28px', height: '28px', opacity: 0.5 }} />
          <SealStamp char="镜" style={{ width: '48px', height: '48px', opacity: 0.8 }} />
        </div>
        <div className="actions">
          <Button to="/">{t('common.back_home')}</Button>
        </div>
      </main>
    </div>
  )
}
