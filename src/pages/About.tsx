/**
 * 关于页 —— 复刻原 about.html:6 节(理念/三镜/九法/行为/隐私/边界)+ 印章 + 回首页。
 */
import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'

type MirrorListItem = { icon: string; title: string; desc: string }
type MethodItem = { name: string; en: string; desc: string }
const MIRROR_TYPES = ['celebrity', 'value', 'ideology'] as const

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

      <header className="hero">
        <div className="mirror-disc" />
        <h1>{t('home.brand')}</h1>
        <p className="subtitle">{t('home.subtitle')}</p>
        <div className="hero-divider"><span /></div>
        <p className="disclaimer">{t('home.disclaimer')}</p>
      </header>

      <main>
        <section className="about-section">
          <img className="about-section-icon" src="/images/hero-mirror.svg" alt="" />
          <h2 className="about-section-title">{t('about.sec_concept')}</h2>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.concept_body') }} />
        </section>

        <section className="about-section">
          <img className="about-section-icon" src="/images/mirror-celebrity.svg" alt="" />
          <h2 className="about-section-title">{t('about.sec_mirrors')}</h2>
          <ul className="mirror-list">
            {mirrors.map((m, i) => (
              <li key={i}>
                <span className="mirror-list-icon">
                  <img src={`/images/mirror-${MIRROR_TYPES[i]}.svg`} alt={m.title} width={32} height={32} />
                </span>
                <div>
                  <div className="mirror-list-title">{m.title}</div>
                  <div className="mirror-list-desc">{m.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <img className="about-section-icon" src="/images/methods/scale.svg" alt="" />
          <h2 className="about-section-title">{t('about.sec_methods')}</h2>
          <div className="method-grid">
            {methods.map((m) => (
              <div className="method-card" key={m.en}>
                <img
                  src={`/images/methods/${m.en.toLowerCase().replace(/\s+/g, '_')}.svg`}
                  className="method-icon"
                  width={40}
                  height={40}
                  alt=""
                />
                <div className="method-name">{m.name}</div>
                <div className="method-en">{m.en}</div>
                <div className="method-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <img className="about-section-icon" src="/images/methods/sort.svg" alt="" />
          <h2 className="about-section-title">{t('about.sec_behavior')}</h2>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.behavior_body') }} />
        </section>

        <section className="about-section">
          <img className="about-section-icon" src="/images/seal.svg" alt="" />
          <h2 className="about-section-title">{t('about.sec_privacy')}</h2>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.privacy_body') }} />
        </section>

        <section className="about-section">
          <img className="about-section-icon" src="/images/mountains.svg" alt="" />
          <h2 className="about-section-title">{t('about.sec_boundary')}</h2>
          <div dangerouslySetInnerHTML={{ __html: t<string>('about.boundary_body') }} />
        </section>

        <div className="section-seal">
          <img src="/images/seal.svg" alt="" aria-hidden="true" />
        </div>
        <div className="actions">
          <Button to="/">{t('common.back_home')}</Button>
        </div>
      </main>
    </div>
  )
}
