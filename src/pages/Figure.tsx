/**
 * 人物详情页 —— 复刻原 figure.html:头像 + 姓名/生卒/角色 + 标签 + 引言 + 简介 + 轶事 + 相关推荐。
 * 增强:艺术字体标题 + 水墨晕染背景 + 多重装饰元素填充空白 + rough.js 手绘方框。
 */
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { qk, fetchCelebrities } from '@/lib/query'
import { Portrait } from '@/components/ui/Portrait'
import { Button } from '@/components/ui/Button'
import { FigureCard } from '@/components/ui/FigureCard'
import type { Celebrity } from '@/lib/types'
import {
  InkBlot,
  SealStamp,
  BrushStroke,
  ScrollDivider,
  CalligraphyColumn,
  AuspiciousCloud,
  WavePattern,
  HexLattice,
  MountainLayers,
  CornerFlourish,
  MeanderBorder,
} from '@/components/ui/Ornaments'
import { RoughSquare, RoughConstellation } from '@/components/ui/RoughInk'

export default function Figure() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  useDocumentMeta({ page: 'figure' })
  const { data: all, isLoading } = useQuery({ queryKey: qk.celebrities(), queryFn: fetchCelebrities })

  const f: Celebrity | undefined = all?.find((x) => String(x.id) === String(id))

  const others = useMemo<Celebrity[]>(() => {
    if (!all || !f) return []
    const rest = all.filter((x) => x.id !== f.id)
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j], rest[i]]
    }
    return rest.slice(0, 3)
  }, [all, f])

  const header = (
    <div className="take-header">
      <Link to="/" className="back-link">{t('figure.back')}</Link>
      <span className="title-label">{t('figure.title')}</span>
    </div>
  )

  if (isLoading) {
    return (
      <div className="container">
        {header}
        <div className="figure-loading">
          <div className="mirror-disc" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!f) {
    return (
      <div className="container" style={{ position: 'relative' }}>
        {header}
        <InkBlot color="var(--accent)" style={{ position: 'absolute', top: '20%', right: '5%', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />
        <div className="figure-error" style={{ position: 'relative', zIndex: 1 }}>
          <p>{t('figure.not_found')}</p>
          <Button to="/">{t('common.back_home')}</Button>
        </div>
      </div>
    )
  }

  const subtitle = [f.era, f.role].filter(Boolean)
  const firstChar = (f.name || '镜').charAt(0)

  return (
    <div className="container" style={{ position: 'relative' }}>
      {header}

      {/* ===== Hero ===== */}
      <header className="figure-hero" style={{ position: 'relative', overflow: 'visible' }}>
        {/* 水墨晕染背景 */}
        <InkBlot color="var(--mirror-celebrity)" style={{ position: 'absolute', top: '-40px', right: '-60px', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.4, zIndex: 0 }} />
        <InkBlot color="var(--mirror-value)" style={{ position: 'absolute', bottom: '-40px', left: '-60px', width: '260px', height: '260px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />

        {/* 书法竖排装饰,填补左右空白 */}
        <CalligraphyColumn chars={['千', '古', '一', '人']} color="var(--mirror-celebrity)" style={{ position: 'absolute', top: '20px', left: '-20px', width: '40px', height: '140px', opacity: 0.5, pointerEvents: 'none', zIndex: 0 }} />
        <CalligraphyColumn chars={['心', '心', '相', '印']} color="var(--mirror-value)" style={{ position: 'absolute', top: '20px', right: '-20px', width: '40px', height: '140px', opacity: 0.5, pointerEvents: 'none', zIndex: 0 }} />

        {/* 印章角标 */}
        <SealStamp char={firstChar} style={{ position: 'absolute', top: '12px', right: '12px', width: '52px', height: '52px', opacity: 0.6, pointerEvents: 'none', zIndex: 1 }} />

        {/* 头像框 —— rough.js 手绘方框 */}
        <div style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
          <RoughSquare color="var(--mirror-celebrity)" seed={42} style={{ position: 'absolute', top: '-12px', left: '-12px', width: 'calc(100% + 24px)', height: 'calc(100% + 24px)', pointerEvents: 'none', opacity: 0.5 }} />
          <Portrait
            src={f.photo || f.image}
            fallback={f.image}
            alt={f.name}
            size={192}
            className="figure-portrait"
          />
        </div>
        <h1 className="figure-name art-title" style={{ position: 'relative', zIndex: 1 }}>{f.name}</h1>
        {subtitle.length > 0 && (
          <div className="figure-subtitle" style={{ position: 'relative', zIndex: 1 }}>
            {subtitle.map((s, i) => (
              <span key={s}>
                {i > 0 && <span className="sep">·</span>}
                {s}
              </span>
            ))}
          </div>
        )}
        {f.tags && f.tags.length > 0 && (
          <div className="profile-tags" style={{ position: 'relative', zIndex: 1 }}>
            {f.tags.map((tg) => <span className="profile-tag" key={tg}>{tg}</span>)}
          </div>
        )}
        {f.quote && (
          <blockquote className="figure-quote art-brush" style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-crazy)' }}>
            {f.quote}
          </blockquote>
        )}
      </header>

      {/* 装饰条:回纹边框 */}
      <div style={{ textAlign: 'center', margin: '24px 0 32px', position: 'relative', zIndex: 1 }}>
        <MeanderBorder color="var(--mirror-celebrity)" style={{ width: '100%', maxWidth: '400px', height: '12px' }} />
      </div>

      {/* ===== 简介 ===== */}
      {f.intro && (
        <div className="figure-intro" style={{ position: 'relative', zIndex: 1 }}>
          <CornerFlourish style={{ position: 'absolute', top: '0', right: '0', width: '36px', height: '36px', opacity: 0.4, pointerEvents: 'none' }} />
          {f.intro}
        </div>
      )}

      {/* 流水波纹装饰 */}
      <div style={{ textAlign: 'center', margin: '24px 0', position: 'relative', zIndex: 1 }}>
        <WavePattern color="var(--mirror-value)" style={{ width: '100%', maxWidth: '400px', height: '30px' }} />
      </div>

      {/* ===== 轶事 ===== */}
      {f.anecdote && (
        <section className="figure-anecdote" style={{ position: 'relative', zIndex: 1 }}>
          <div className="figure-anecdote-title art-title">{t('figure.anecdote_title')}</div>
          <div className="figure-anecdote-body">{f.anecdote}</div>
          {/* 飘带 */}
          <BrushStroke color="var(--mirror-celebrity)" style={{ width: '180px', height: '20px', margin: '16px auto 0', opacity: 0.5 }} />
        </section>
      )}

      {/* 卷轴分隔装饰 */}
      <div style={{ textAlign: 'center', margin: '32px 0', position: 'relative', zIndex: 1 }}>
        <ScrollDivider color="var(--mirror-celebrity)" style={{ width: '280px', height: '16px' }} />
      </div>

      {/* 祥云装饰 */}
      <div style={{ textAlign: 'center', margin: '0 0 24px', position: 'relative', zIndex: 1, opacity: 0.6 }}>
        <AuspiciousCloud color="var(--mirror-celebrity)" style={{ width: '160px', height: '60px' }} />
      </div>

      <div className="figure-actions" style={{ position: 'relative', zIndex: 1 }}>
        <Button to="/">{t('common.back_home')}</Button>
        <Button variant="secondary" to="/figures">{t('nav.figures')}</Button>
      </div>

      {/* ===== 相关推荐 ===== */}
      <div className="figure-related" style={{ position: 'relative', zIndex: 1 }}>
        <div className="figure-related-title art-title">{t('figure.related_title')}</div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 12 }}>
          {t('figure.related_desc')}
        </p>
        {/* 星图装饰 */}
        <RoughConstellation color="var(--mirror-celebrity)" seed={73} style={{ width: '100%', maxWidth: '400px', height: '80px', marginBottom: '16px', opacity: 0.5 }} />
        {others.length > 0 && (
          <div className="figure-related-grid">
            {others.map((o) => <FigureCard key={o.id} figure={o} showBlurb={false} size={64} />)}
          </div>
        )}
        <Button variant="link" to="/take/celebrity">{t('figure.related_cta')}</Button>
      </div>

      {/* 龟甲纹装饰 */}
      <div style={{ textAlign: 'center', margin: '32px 0 16px', position: 'relative', zIndex: 1, opacity: 0.5 }}>
        <HexLattice color="var(--mirror-celebrity)" style={{ width: '200px', height: '64px' }} />
      </div>

      {/* 远山层叠底部装饰 */}
      <MountainLayers color="var(--ink-ghost)" style={{ width: '100%', maxWidth: '600px', height: '80px', margin: '24px auto 0', display: 'block', position: 'relative', zIndex: 1 }} />
    </div>
  )
}
