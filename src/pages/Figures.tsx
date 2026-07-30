/**
 * 名人志浏览页 —— 复刻原 figures.html:搜索 + 标签筛选 + 名人卡网格。
 * 增强:艺术字体标题 + 装饰背景 + 卡片悬浮动效。
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { qk, fetchCelebrities } from '@/lib/query'
import { FigureCard } from '@/components/ui/FigureCard'
import { cn, asset } from '@/lib/utils'
import { InkBlot, SealStamp, BrushStroke, TrinityMirror, ConcentricRings } from '@/components/ui/Ornaments'

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
        {/* 水墨晕染背景装饰 */}
        <InkBlot color="var(--mirror-celebrity)" style={{ position: 'absolute', bottom: '-40px', left: '-60px', width: '280px', height: '280px', pointerEvents: 'none', opacity: 0.4, zIndex: 0 }} />
        <SealStamp char="名" style={{ position: 'absolute', top: '12px', right: '12px', width: '52px', height: '52px', opacity: 0.5, pointerEvents: 'none' }} />
        <ConcentricRings color="var(--mirror-celebrity)" style={{ position: 'absolute', top: '20px', left: '20px', width: '100px', height: '100px', opacity: 0.25, pointerEvents: 'none' }} />

        <div className="fig-eyebrow art-seal" style={{ fontFamily: 'var(--font-seal)' }}>FIGURES · 名人志</div>
        <h1 className="fig-title art-title">{t('home.figures.title')}</h1>
        <p className="fig-sub">{t('home.figures.sub')}</p>

        {/* 飘带装饰 */}
        <BrushStroke color="var(--mirror-celebrity)" style={{ width: '200px', height: '20px', margin: '12px auto 0', opacity: 0.5 }} />

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

      {/* 三镜合一装饰 */}
      <div style={{ textAlign: 'center', margin: '8px 0 24px', opacity: 0.5 }}>
        <TrinityMirror style={{ width: '120px', height: '50px' }} />
      </div>

      <div className="fig-grid">
        {isLoading ? (
          <div className="fig-empty">{t('common.loading')}</div>
        ) : error ? (
          <div className="fig-empty">{t('common.error_generic')}</div>
        ) : filtered.length === 0 ? (
          <div className="fig-empty">
            <img src={asset('/images/empty-mirror.svg')} className="fig-empty-img" alt="" width={140} height={140} aria-hidden="true" />
            {t('home.figures.no_match')}
          </div>
        ) : (
          filtered.map((f) => <FigureCard key={f.id} figure={f} />)
        )}
      </div>

      {/* 底部装饰条 */}
      <div className="deco-strip" aria-hidden="true" style={{ marginTop: '40px' }}>
        <span className="deco-strip-dot" />
        <span className="deco-strip-line" />
        <span className="deco-strip-diamond" />
        <span className="deco-strip-line" />
        <span className="deco-strip-dot" />
      </div>
    </div>
  )
}
