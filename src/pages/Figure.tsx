/**
 * 人物详情页 —— 复刻原 figure.html:头像 + 姓名/生卒/角色 + 标签 + 引言 + 简介 + 轶事 + 相关推荐。
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
      <div className="container">
        {header}
        <div className="figure-error">
          <p>{t('figure.not_found')}</p>
          <Button to="/">{t('common.back_home')}</Button>
        </div>
      </div>
    )
  }

  const subtitle = [f.era, f.role].filter(Boolean)

  return (
    <div className="container">
      {header}

      <header className="figure-hero">
        <Portrait
          src={f.photo || f.image}
          fallback={f.image}
          alt={f.name}
          size={160}
          className="figure-portrait"
        />
        <h1 className="figure-name">{f.name}</h1>
        {subtitle.length > 0 && (
          <div className="figure-subtitle">
            {subtitle.map((s, i) => (
              <span key={s}>
                {i > 0 && <span className="sep">·</span>}
                {s}
              </span>
            ))}
          </div>
        )}
        {f.tags && f.tags.length > 0 && (
          <div className="profile-tags">
            {f.tags.map((tg) => <span className="profile-tag" key={tg}>{tg}</span>)}
          </div>
        )}
        {f.quote && <blockquote className="figure-quote">{f.quote}</blockquote>}
      </header>

      {f.intro && <div className="figure-intro">{f.intro}</div>}

      {f.anecdote && (
        <section className="figure-anecdote">
          <div className="figure-anecdote-title">{t('figure.anecdote_title')}</div>
          <div className="figure-anecdote-body">{f.anecdote}</div>
        </section>
      )}

      <div className="figure-actions">
        <Button to="/">{t('common.back_home')}</Button>
        <Button variant="secondary" to="/figures">{t('nav.figures')}</Button>
      </div>

      <div className="figure-related">
        <div className="figure-related-title">{t('figure.related_title')}</div>
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
    </div>
  )
}
