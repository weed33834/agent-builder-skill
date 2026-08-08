/**
 * 关于页 —— 复刻原 about.html:6 节(理念/三镜/九法/行为/隐私/边界)+ 印章 + 回首页。
 * 增强:艺术字体标题 + 卡片化布局 + 装饰组件 + 书法引言。
 */
import { motion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { asset } from '@/lib/utils'
import { MountainRange } from '@/components/ui/Ornaments'
import { FadeIn } from '@/components/ui/Animations'

type MirrorListItem = { icon: string; title: string; desc: string }
type MethodItem = { name: string; en: string; desc: string }
const MIRROR_TYPES = ['celebrity', 'value', 'ideology'] as const
const MIRROR_NUMS = ['壹', '贰', '叁']
const MIRROR_EN = ['CELEBRITY', 'VALUE', 'IDEOLOGY']

export default function About() {
  const { t } = useI18n()
  const helmet = useDocumentMeta({ page: 'about' })
  const mirrors = t<MirrorListItem[]>('about.mirrors')
  const methods = t<MethodItem[]>('about.methods')

  return (
    <>
      {helmet}
      <motion.div
        className="container"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
      <header className="hero" style={{ position: 'relative', overflow: 'visible' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}>
          <div className="mirror-disc" style={{ position: 'relative', zIndex: 1 }} />
        </motion.div>
        <h1 className="art-title" style={{ position: 'relative', zIndex: 1 }}>{t('home.brand')}</h1>
        <p className="subtitle" style={{ position: 'relative', zIndex: 1 }}>{t('home.subtitle')}</p>
        <div className="hero-divider"><span /></div>
        <p className="disclaimer">{t('home.disclaimer')}</p>
      </header>

      <main>
        <FadeIn>
          <section className="about-section">
            <div className="about-section-icon-wrap">
              <img className="about-section-icon" src={asset('/images/hero-mirror.jpg')} alt="" />
              <h2 className="about-section-title art-title">{t('about.sec_concept')}</h2>
            </div>
            <div dangerouslySetInnerHTML={{ __html: t<string>('about.concept_body') }} />
            <div className="about-quote art-brush">以镜照心 · 以心见己</div>
          </section>
        </FadeIn>

        <FadeIn delay={0.1}>
          <section className="about-section">
            <div className="about-section-icon-wrap">
              <img className="about-section-icon" src={asset('/images/mirror-celebrity.jpg')} alt="" />
              <h2 className="about-section-title art-title">{t('about.sec_mirrors')}</h2>
            </div>
            <ul className="mirror-list">
              {mirrors.map((m, i) => (
                <li key={i} style={{ borderLeftColor: `var(--mirror-${MIRROR_TYPES[i]})` }}>
                  <span className="mirror-list-num">{MIRROR_NUMS[i]}</span>
                  <span className="mirror-list-icon" style={{ borderColor: `var(--mirror-${MIRROR_TYPES[i]})` }}>
                    <img src={asset(`/images/mirror-${MIRROR_TYPES[i]}.jpg`)} alt={m.title} width={32} height={32} />
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
        </FadeIn>

        <FadeIn delay={0.2}>
          <section className="about-section">
            <div className="about-section-icon-wrap">
              <img className="about-section-icon" src={asset('/images/methods/scale.jpg')} alt="" />
              <h2 className="about-section-title art-title">{t('about.sec_methods')}</h2>
            </div>
            <div className="method-grid">
              {methods.map((m, i) => (
                <div className="method-card" key={m.en}>
                  <span className="method-num">No.{String(i + 1).padStart(2, '0')}</span>
                  <div className="method-icon-wrap">
                    <img
                      src={asset(`/images/methods/${m.en.toLowerCase().replace(/\s+/g, '_')}.jpg`)}
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
        </FadeIn>

        <FadeIn delay={0.3}>
          <section className="about-section">
            <div className="about-section-icon-wrap">
              <img className="about-section-icon" src={asset('/images/methods/sort.jpg')} alt="" />
              <h2 className="about-section-title art-title">{t('about.sec_behavior')}</h2>
            </div>
            <div dangerouslySetInnerHTML={{ __html: t<string>('about.behavior_body') }} />
          </section>
        </FadeIn>

        <FadeIn delay={0.35}>
          <section className="about-section">
            <div className="about-section-icon-wrap">
              <img className="about-section-icon" src={asset('/images/seal.jpg')} alt="" />
              <h2 className="about-section-title art-title">{t('about.sec_privacy')}</h2>
            </div>
            <div dangerouslySetInnerHTML={{ __html: t<string>('about.privacy_body') }} />
          </section>
        </FadeIn>

        <FadeIn delay={0.4}>
          <section className="about-section">
            <div className="about-section-icon-wrap">
              <img className="about-section-icon" src={asset('/images/mountains.jpg')} alt="" />
              <h2 className="about-section-title art-title">{t('about.sec_boundary')}</h2>
            </div>
            <div dangerouslySetInnerHTML={{ __html: t<string>('about.boundary_body') }} />
            <MountainRange style={{ width: '100%', maxWidth: '400px', height: '60px', margin: '32px auto 0', display: 'block' }} />
          </section>
        </FadeIn>

        <div className="actions" style={{ marginTop: '32px' }}>
          <Button to="/">{t('common.back_home')}</Button>
        </div>
      </main>
    </motion.div>
    </>
  )
}
