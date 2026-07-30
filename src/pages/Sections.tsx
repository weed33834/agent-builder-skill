/**
 * 板块入口页 —— 全站测评的总入口。
 * 展示所有板块(自我探索/娱乐趣味/关系镜像...),点击进入板块详情。
 * 已上线板块可点击,未上线显示"敬请期待"。
 * 这是首页"开始"按钮的新跳转目标,替代原来直接跳 /take/celebrity。
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { categories } from '@/data/categories'
import { assessments } from '@/lib/data'
import { asset } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { InkBlot, SealStamp, BrushStroke, TrinityMirror, MountainLayers } from '@/components/ui/Ornaments'

export default function Sections() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'home' })

  return (
    <div className="container" style={{ position: 'relative' }}>
      {/* 背景装饰 */}
      <InkBlot style={{ position: 'absolute', top: '20px', right: '-60px', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />
      <InkBlot color="var(--mirror-value)" style={{ position: 'absolute', bottom: '40px', left: '-80px', width: '260px', height: '260px', pointerEvents: 'none', opacity: 0.2, zIndex: 0 }} />

      <header className="hero" style={{ position: 'relative', zIndex: 1, paddingBottom: 32 }}>
        <SealStamp char="镜" style={{ position: 'absolute', top: '12px', right: '12px', width: '52px', height: '52px', opacity: 0.5, pointerEvents: 'none' }} />
        <div className="mirror-disc" style={{ width: 72, height: 72, marginBottom: 20 }} />
        <p className="hero-eyebrow">MIND MIRROR · 全部测评</p>
        <h1 className="art-title" style={{ fontSize: 56 }}>{t('sections.title')}</h1>
        <p className="hero-title-en">All Assessments</p>
        <p className="hero-lede" style={{ maxWidth: 560, margin: '16px auto 0' }}>{t('sections.lede')}</p>
        <div className="hero-divider"><span /></div>
        <BrushStroke style={{ width: '200px', height: '20px', margin: '0 auto', opacity: 0.5 }} />
      </header>

      {/* 三镜合一装饰 */}
      <div style={{ textAlign: 'center', margin: '8px 0 40px', opacity: 0.6, position: 'relative', zIndex: 1 }}>
        <TrinityMirror style={{ width: '160px', height: '60px' }} />
      </div>

      {/* 板块网格 */}
      <div className="sections-grid">
        {categories.map((cat, i) => {
          // 该板块下已实现的测评(从 assessments 元数据查)
          const liveAssessments = cat.assessments
            .map((at) => assessments.find((a) => a.type === at))
            .filter((a): a is NonNullable<typeof a> => !!a)
          const totalQuestions = liveAssessments.reduce((s, a) => s + a.question_count, 0)

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`section-card${cat.available ? '' : ' coming'}`}
              data-section={cat.theme}
              style={{ '--cat-accent': cat.accent } as React.CSSProperties}
            >
              {cat.available ? (
                <Link to={`/section/${cat.id}`} className="section-card-link">
                  {/* 角标:板块序号 */}
                  <span className="section-card-num">No.0{i + 1}</span>
                  {/* 图标区 */}
                  <div className="section-card-icon-wrap">
                    <img src={asset(`/images/sections/${cat.icon}.svg`)} alt="" width={56} height={56} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <div className="section-card-body">
                    <p className="section-card-subtitle">{cat.subtitle}</p>
                    <h2 className="section-card-title art-title">{cat.title}</h2>
                    <p className="section-card-tagline art-brush" style={{ fontFamily: 'var(--font-crazy)' }}>{cat.tagline}</p>
                    <p className="section-card-desc">{cat.desc}</p>
                  </div>
                  <div className="section-card-meta">
                    <span><span className="num">{liveAssessments.length}</span> {t('sections.units')}</span>
                    <span><span className="num">{totalQuestions}</span> {t('common.questions')}</span>
                    <span className="section-card-enter">{t('home.enter')}</span>
                  </div>
                </Link>
              ) : (
                <div className="section-card-link section-card-locked" aria-disabled="true">
                  <span className="section-card-num">No.0{i + 1}</span>
                  <div className="section-card-icon-wrap">
                    <img src={asset(`/images/sections/${cat.icon}.svg`)} alt="" width={56} height={56} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <div className="section-card-body">
                    <p className="section-card-subtitle">{cat.subtitle}</p>
                    <h2 className="section-card-title art-title">{cat.title}</h2>
                    <p className="section-card-tagline art-brush" style={{ fontFamily: 'var(--font-crazy)' }}>{cat.tagline}</p>
                    <p className="section-card-desc">{cat.desc}</p>
                  </div>
                  <div className="section-card-coming">
                    <span className="section-card-coming-badge">{t('sections.coming_soon')}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* 远山底部装饰 */}
      <MountainLayers color="var(--ink-ghost)" style={{ width: '100%', maxWidth: '600px', height: '80px', margin: '40px auto 0', display: 'block', position: 'relative', zIndex: 1 }} />

      <div className="actions" style={{ position: 'relative', zIndex: 1, marginTop: 32 }}>
        <Button variant="secondary" to="/">{t('common.back_home')}</Button>
      </div>
    </div>
  )
}
