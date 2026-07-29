/**
 * 名人志浏览页 —— 复刻原 figures.html:搜索 + 标签筛选 + 名人卡网格。
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { qk, fetchCelebrities } from '@/lib/query'
import { FigureCard } from '@/components/ui/FigureCard'
import { cn } from '@/lib/utils'

export default function Figures() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'figure' })
  const { data: all, isLoading, error } = useQuery({ queryKey: qk.celebrities(), queryFn: fetchCelebrities })
  const [activeTag, setActiveTag] = useState('')
  const [query, setQuery] = useState('')

  const tags = useMemo(() => {
    if (!all) return []
    const set = new Set<string>()
    all.forEach((f) => (f.tags || []).forEach((tg) => set.add(tg)))
    return Array.from(set)
  }, [all])

  const chips = [
    { key: '', label: t('home.figures.chip_all') },
    ...tags.slice(0, 12).map((k) => ({ key: k, label: k })),
  ]

  const filtered = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    return all.filter((f) => {
      const matchTag = !activeTag || (f.tags || []).includes(activeTag)
      const matchQ =
        !q ||
        (f.name || '').toLowerCase().includes(q) ||
        (f.role || '').toLowerCase().includes(q) ||
        (f.tags || []).some((tg) => tg.toLowerCase().includes(q))
      return matchTag && matchQ
    })
  }, [all, activeTag, query])

  return (
    <div className="container">
      <div className="take-header">
        <Link to="/" className="back-link">{t('common.back')}</Link>
      </div>

      <header className="fig-hero">
        <div className="fig-eyebrow">FIGURES</div>
        <h1 className="fig-title">{t('home.figures.title')}</h1>
        <p className="fig-sub">{t('home.figures.sub')}</p>
        <input
          className="fig-search"
          type="search"
          placeholder={t('home.figures.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="fig-chips">
          {chips.map((c) => (
            <span
              key={c.key}
              className={cn('fig-chip', c.key === activeTag && 'active')}
              onClick={() => setActiveTag(c.key)}
            >
              {c.label}
            </span>
          ))}
        </div>
        <div className="fig-count">{t('home.figures.count', { n: filtered.length })}</div>
      </header>

      <div className="fig-grid">
        {isLoading ? (
          <div className="fig-empty">{t('common.loading')}</div>
        ) : error ? (
          <div className="fig-empty">{t('common.error_generic')}</div>
        ) : filtered.length === 0 ? (
          <div className="fig-empty">{t('home.figures.no_match')}</div>
        ) : (
          filtered.map((f) => <FigureCard key={f.id} figure={f} />)
        )}
      </div>
    </div>
  )
}
