/**
 * 人物详情页 —— 复刻原 figure.html:头像 + 姓名/生卒/角色 + 标签 + 引言 + 简介 + 轶事 + 相关推荐。
 * 增强:艺术字体标题 + 水墨晕染背景 + 多重装饰元素填充空白。
 */
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { qk, fetchCelebrities } from '@/lib/query'
import { Portrait } from '@/components/ui/Portrait'
import { Button } from '@/components/ui/Button'
import { FigureCard } from '@/components/ui/FigureCard'
import type { Celebrity } from '@/lib/types'
import { MountainLayers } from '@/components/ui/Ornaments'

export default function Figure() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const helmet = useDocumentMeta({ page: 'figure' })
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

  if (isLoading) {
    return (
      <>
        {helmet}
        <div className="container">
          <div className="figure-loading">
            <div className="mirror-disc" />
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </>
    )
  }

  if (!f) {
    return (
      <>
        {helmet}
        <div className="container" style={{ position: 'relative' }}>
          <div className="figure-error" style={{ position: 'relative', zIndex: 1 }}>
            <p>{t('figure.not_found')}</p>
            <Button to="/">{t('common.back_home')}</Button>
          </div>
        </div>
      </>
    )
  }

  const subtitle = [f.era, f.role].filter(Boolean)

  return (
    <>
      {helmet}
      <div className="container" style={{ position: 'relative' }}>

        {/* ===== Hero ===== */}
      <header className="figure-hero" style={{ position: 'relative', overflow: 'visible' }}>
        <div style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
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

      {/* ===== 简介 ===== */}
      {f.intro && (
        <div className="figure-intro" style={{ position: 'relative', zIndex: 1 }}>
          {f.intro}
        </div>
      )}

      {/* ===== 轶事 ===== */}
      {f.anecdote && (
        <section className="figure-anecdote" style={{ position: 'relative', zIndex: 1 }}>
          <div className="figure-anecdote-title art-title">{t('figure.anecdote_title')}</div>
          <div className="figure-anecdote-body">{f.anecdote}</div>
        </section>
      )}

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
        {others.length > 0 && (
          <div className="figure-related-grid">
            {others.map((o) => <FigureCard key={o.id} figure={o} showBlurb={false} size={64} />)}
          </div>
        )}
        <Button variant="link" to="/take/celebrity">{t('figure.related_cta')}</Button>
      </div>

      {/* 远山层叠底部装饰 */}
      <MountainLayers color="var(--ink-ghost)" style={{ width: '100%', maxWidth: '600px', height: '80px', margin: '24px auto 0', display: 'block', position: 'relative', zIndex: 1 }} />
    </div>
    </>
  )
}
