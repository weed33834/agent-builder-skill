/**
 * 板块详情页 —— 展示某个板块下的所有测评(镜子)。
 * 路由:/section/:id  (id 对应 categories.ts 的 id 字段)
 * 已上线测评可点击进入答题,未上线的显示"敬请期待"。
 * 板块主题色通过 data-section 属性切换 CSS 变量。
 *
 * 特殊处理:galgame 走独立路由(/take-galgame)与独立霓虹主题,
 * 不在 assessments 元数据里,这里用 galgameMeta 单独并入卡片列表。
 */
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { categories } from '@/data/categories'
import { assessments } from '@/lib/data'
import { galgameMeta } from '@/data/galgame'
import { CHAR_QUESTIONS } from '@/data/galgame-characters'
import { asset } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { InkBlot, SealStamp, BrushStroke, ConcentricRings, MountainLayers } from '@/components/ui/Ornaments'

// 测评卡片的主题色调(按 type)
const ASSESSMENT_ACCENT: Record<string, string> = {
  celebrity: 'var(--mirror-celebrity)',
  value: 'var(--mirror-value)',
  ideology: 'var(--mirror-ideology)',
  galgame: '#b8408b',
  'galgame-char': '#ff2d95',
}

/** 统一的卡片元数据:常规测评 + galgame(独立路由) */
interface CardMeta {
  type: string
  title: string
  question_count: number
  estimated_minutes: number
  /** 跳转路由:常规 /take/:type,galgame /take-galgame */
  route: string
}

function resolveCards(catAssessments: string[]): CardMeta[] {
  const cards: CardMeta[] = []
  for (const at of catAssessments) {
    if (at === 'galgame') {
      cards.push({
        type: 'galgame',
        title: galgameMeta.title,
        question_count: galgameMeta.question_count,
        estimated_minutes: galgameMeta.estimated_minutes,
        route: '/take-galgame',
      })
      continue
    }
    if (at === 'galgame-char') {
      cards.push({
        type: 'galgame-char',
        title: 'Galgame 角色画像',
        question_count: CHAR_QUESTIONS.length,
        estimated_minutes: 3,
        route: '/take-galgame-char',
      })
      continue
    }
    const a = assessments.find((x) => x.type === at)
    if (a) cards.push({ type: a.type, title: a.title, question_count: a.question_count, estimated_minutes: a.estimated_minutes, route: `/take/${a.type}` })
  }
  return cards
}

export default function SectionDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const cat = categories.find((c) => c.id === id)
  useDocumentMeta({ page: 'home' })

  if (!cat) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p className="art-title" style={{ fontSize: 28, color: 'var(--ink-faint)' }}>板块不存在</p>
        <div className="actions" style={{ marginTop: 24 }}>
          <Button to="/sections">{t('sections.back_to_sections')}</Button>
        </div>
      </div>
    )
  }

  const liveAssessments = resolveCards(cat.assessments)

  return (
    <div
      className="container"
      data-section={cat.theme}
      style={{ position: 'relative', '--cat-accent': cat.accent } as React.CSSProperties}
    >
      {/* 背景装饰 */}
      <InkBlot style={{ position: 'absolute', top: '20px', right: '-60px', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.28, zIndex: 0 }} />
      <InkBlot style={{ position: 'absolute', bottom: '60px', left: '-80px', width: '240px', height: '240px', pointerEvents: 'none', opacity: 0.18, zIndex: 0 }} />

      <header className="hero" style={{ position: 'relative', zIndex: 1, paddingBottom: 28 }}>
        <SealStamp style={{ position: 'absolute', top: '12px', right: '12px', width: '52px', height: '52px', opacity: 0.5, pointerEvents: 'none' }} />
        {/* 板块图标环 */}
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 18px' }}>
          <ConcentricRings color={cat.accent} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }} />
          <div style={{
            position: 'absolute', inset: '18px', borderRadius: '50%',
            background: `radial-gradient(circle, ${cat.accent}22 0%, transparent 70%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={asset(`/images/sections/${cat.icon}.jpg`)} alt="" width={40} height={40} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
        </div>
        <p className="hero-eyebrow" style={{ color: cat.accent }}>{cat.subtitle.toUpperCase()} · 板块</p>
        <h1 className="art-title" style={{ fontSize: 52 }}>{cat.title}</h1>
        <p className="hero-title-en">{cat.tagline}</p>
        <p className="hero-lede" style={{ maxWidth: 580, margin: '14px auto 0' }}>{cat.desc}</p>
        <div className="hero-divider"><span /></div>
        <BrushStroke color={cat.accent} style={{ width: '200px', height: '20px', margin: '0 auto', opacity: 0.55 }} />
      </header>

      {/* 测评选择提示 */}
      <div style={{ textAlign: 'center', margin: '8px 0 32px', position: 'relative', zIndex: 1 }}>
        <h2 className="art-title" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>{t('sections.pick_assessment')}</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>{t('sections.pick_assessment_sub')}</p>
      </div>

      {/* 测评网格 */}
      <div className="mirrors-grid" style={{ position: 'relative', zIndex: 1 }}>
        {liveAssessments.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
              {t('sections.coming_soon')}
            </p>
          </div>
        ) : (
          liveAssessments.map((a, i) => {
            const accent = ASSESSMENT_ACCENT[a.type] || cat.accent
            const numCN = ['壹', '贰', '叁', '肆', '伍'][i] || String(i + 1)
            const isGalgame = a.type === 'galgame' || a.type === 'galgame-char'
            return (
              <motion.div
                key={a.type}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to={a.route} className={`mirror-card${isGalgame ? ' mirror-card-neon' : ''}`} data-type={a.type} style={{ '--cat-accent': accent } as React.CSSProperties}>
                  <span className="mirror-card-num">No.{String(i + 1).padStart(2, '0')}</span>
                  <div className="card-icon">
                    <img src={asset(`/images/mirror-${a.type}.jpg`)} className="mirror-card-icon" width={48} height={48} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <span className="art-seal" style={{ position: 'absolute', top: '48px', right: '20px', fontSize: '22px', color: accent, opacity: 0.5 }}>{numCN}</span>
                  <h2>{t(`home.mirrors.${a.type}.title`)}</h2>
                  <p className="tagline">{t(`home.mirrors.${a.type}.tagline`)}</p>
                  <p className="desc">{t(`home.mirrors.${a.type}.desc`)}</p>
                  <div className="meta">
                    <span><span className="num">{a.question_count}</span> {t('common.questions')}</span>
                    <span><span className="num">{a.estimated_minutes}</span> {t('common.minutes')}</span>
                  </div>
                  <div className="start-hint">{t('home.enter')}</div>
                </Link>
              </motion.div>
            )
          })
        )}
      </div>

      {/* 板块内未上线的测评占位(预留扩展) */}
      {cat.assessments.length > liveAssessments.length && (
        <div style={{ textAlign: 'center', marginTop: 24, position: 'relative', zIndex: 1 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-faint)', letterSpacing: '0.18em' }}>
            更多测评筹备中 · {t('sections.coming_soon')}
          </p>
        </div>
      )}

      <MountainLayers color="var(--ink-ghost)" style={{ width: '100%', maxWidth: '600px', height: '80px', margin: '40px auto 0', display: 'block', position: 'relative', zIndex: 1 }} />

      <div className="actions" style={{ position: 'relative', zIndex: 1, marginTop: 32 }}>
        <Button variant="secondary" to="/sections">{t('sections.back_to_sections')}</Button>
      </div>
    </div>
  )
}
