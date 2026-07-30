/**
 * 报告页 —— 移植自原 report.js。
 * 解码 ?r= (base64 {type,result}),失败回退 localStorage 最近结果;均无则错误卡。
 * 渲染:hero(镜面/标题/标签/摘要) + 核心匹配 + 维度详解(雷达图+下钻) +
 *      内在冲突 + 行为洞察 + 增长区块(镜象名片/推荐/继续照见) + 操作按钮 + 分享弹窗。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { useLastResultStore } from '@/store'
import { play, vibrate } from '@/lib/audio'
import { Button } from '@/components/ui/Button'
import { RadarChart } from '@/components/RadarChart'
import { ShareModal } from '@/components/ShareModal'
import { asset } from '@/lib/utils'
import type { AssessmentType, ComputeResult, Conflict, Insight, Match } from '@/lib/types'

const INSIGHT_ORDER = ['decision_style', 'consistency', 'ambivalence', 'courage_index', 'time_pressure_effect', 'iat_bias'] as const
const NEXT_MIRROR: Record<AssessmentType, AssessmentType> = { celebrity: 'value', value: 'ideology', ideology: 'celebrity' }
const VALID_TYPES: AssessmentType[] = ['celebrity', 'value', 'ideology']

interface Decoded {
  type: AssessmentType
  result: ComputeResult
}

function decodeShare(raw: string): Decoded | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(raw))))
    if (obj && obj.type && obj.result && VALID_TYPES.includes(obj.type)) {
      return { type: obj.type, result: obj.result as ComputeResult }
    }
  } catch { /* 链接损坏 */ }
  return null
}

function topDimension(r: ComputeResult): string | null {
  let bestKey: string | null = null
  let bestVal = -Infinity
  for (const [k, v] of Object.entries(r.dimensions || {})) {
    const num = typeof v === 'number' ? v : parseFloat(v)
    if (!isNaN(num) && num > bestVal) { bestVal = num; bestKey = k }
  }
  return bestKey
}

export default function Report() {
  const { type: pathType } = useParams<{ type: string }>()
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const lastResult = useLastResultStore((s) => s.result)

  const a = assessments.find((x) => x.type === pathType)
  useDocumentMeta({ page: 'report', vars: { name: a?.title || '' } })

  const decoded = useMemo<Decoded | null>(() => {
    const raw = searchParams.get('r') || lastResult || ''
    return raw ? decodeShare(raw) : null
  }, [searchParams, lastResult])

  const [shareOpen, setShareOpen] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const type = decoded?.type
  const r = decoded?.result

  // 主题色 + 完成庆祝
  useEffect(() => {
    if (!type) return
    document.body.dataset.mirror = type
    const id = window.setTimeout(() => {
      setAnimate(true)
      play('complete')
      vibrate([20, 30, 20])
    }, 650)
    return () => {
      window.clearTimeout(id)
      delete document.body.dataset.mirror
    }
  }, [type])

  if (!decoded || !type || !r) {
    return (
      <div className="container" style={{ maxWidth: 560, padding: '120px 40px', textAlign: 'center' }}>
        <div className="result-error">
          <div className="result-error-seal">印</div>
          <h3 className="result-error-title">{t('report.error_title')}</h3>
          <p className="result-error-desc">{t('report.error_desc')}</p>
          <Button to="/">{t('report.error_back')}</Button>
        </div>
      </div>
    )
  }

  const dimEntries = Object.entries(r.dimensions || {}) as [string, number][]
  const tags = (r.profile && r.profile.tags) || []
  const pcts = r.percentiles || {}
  const titleInfo = t<{ eyebrow: string; title: string }>(`report.titles.${type}`) || { eyebrow: type.toUpperCase(), title: t('common.your_mirror') }

  // 镜面清晰度(基于一致性)
  const cIns = (r.insights && r.insights.consistency) || ({} as Insight)
  const cCode = cIns.code || ''
  const clarity = cCode === 'high' ? 'high' : cCode === 'low' ? 'low' : ''

  // i18n 查表,缺键返回 null
  const tOrNull = (key: string): string | null => {
    const s = t<string>(key)
    return s === key ? null : s
  }
  const dimLabel = (k: string | null): string => (k ? (tOrNull(`report.dim_labels.${k}`) || k) : '')

  // 增长:镜象名片
  let subjectName = ''
  let poetic = ''
  if (type === 'celebrity') {
    const top = (r.matches && r.matches[0]) || null
    subjectName = top ? top.name : (titleInfo.title || '')
    poetic = top ? t('growth.card_poetic_celebrity', { name: top.name }) : ''
  } else {
    const k = topDimension(r)
    subjectName = dimLabel(k)
    if (k) {
      poetic = t(type === 'value' ? 'growth.card_poetic_value' : 'growth.card_poetic_ideology', { dim: dimLabel(k), axis: dimLabel(k) })
    }
  }
  const eyebrow = t<string>(`nav.${type}`) || type

  // 增长:推荐
  let recoInner: ReactNode = null
  if (type === 'celebrity') {
    const top = (r.matches && r.matches[0]) || null
    if (top && top.name) {
      const text = t('growth.reco_celebrity', { name: top.name })
      recoInner = top.id
        ? <Link className="reco-link" to={`/figure/${top.id}`}>{text} →</Link>
        : <span className="reco-text">{text}</span>
    }
  } else {
    const k = topDimension(r)
    if (k) {
      const label = dimLabel(k)
      const nextType = NEXT_MIRROR[type] || type
      const text = t(type === 'value' ? 'growth.reco_value' : 'growth.reco_ideology', { dim: label, axis: label })
      recoInner = (
        <>
          {text} <Link className="reco-link" to={`/take/${nextType}`}>{t<string>(`nav.${nextType}`)} →</Link>
          {type === 'ideology' && <p className="growth-neutral">{t('growth.ideology_neutral')}</p>}
        </>
      )
    }
  }

  // 增长:继续照见(其余镜子)
  const otherMirrors = assessments.filter((m) => m.type !== type)

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="container" style={{ maxWidth: 860 }}>
      {/* ===== Hero ===== */}
      <div className="report-hero">
        <div className="mirror-disc" {...(clarity ? { 'data-clarity': clarity } : {})} />
        <div className="report-eyebrow">{titleInfo.eyebrow}</div>
        <h2 className="report-title">{titleInfo.title}</h2>
        <div className="hero-divider"><span /></div>
        {tags.length ? (
          <div className="profile-tags">
            {tags.map((tag, i) => <span className="profile-tag" key={i}>{tag}</span>)}
          </div>
        ) : (
          <p className="profile-empty">{t('report.tags_empty')}</p>
        )}
        <p className="report-summary">{r.summary}</p>
      </div>

      {/* ===== 核心匹配 ===== */}
      <section className="report-section">
        <h3>{t('report.sec_matches')}</h3>
        <div className="match-list">
          {(r.matches || []).map((m: Match, i) => {
            const isCelebrity = type === 'celebrity'
            const imgUrl = asset(isCelebrity ? (m.photo || m.image || '') : (m.image || m.photo || ''))
            const hasImage = !!imgUrl
            return (
              <div className={`match-item${i === 0 ? ' top' : ''}${hasImage ? ' with-image' : ''}`} key={m.id || i}>
                {hasImage && (
                  isCelebrity && m.id ? (
                    <Link className="match-portrait" to={`/figure/${m.id}`}>
                      <img src={imgUrl} alt={m.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </Link>
                  ) : (
                    <div className="match-portrait">
                      <img src={imgUrl} alt={m.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                  )
                )}
                <div className="match-body">
                  <div className="match-name">{m.name}</div>
                  <div className="match-blurb">{m.blurb}</div>
                  {m.quote && <div className="match-quote">"{m.quote}"</div>}
                </div>
                <div className="match-pct">
                  {m.match_pct != null ? m.match_pct : ''}
                  <span style={{ fontSize: 14, opacity: 0.6 }}>%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== 维度详解 ===== */}
      {dimEntries.length > 0 && (
        <section className="report-section">
          <h3>{t('report.sec_dimensions')}</h3>
          <RadarChart entries={dimEntries} />
          <div className="dim-grid">
            {dimEntries.map(([k, v]) => {
              const pct = pcts[k]
              const pctText = pct !== undefined && pct !== null ? t('report.higher_than', { pct: Math.round(pct) }) : ''
              const label = tOrNull(`report.dim_labels.${k}`) || k
              const desc = tOrNull(`report.dim_desc.${k}`) || ''
              const isOpen = !!expanded[k]
              return (
                <div
                  className="dim-item"
                  key={k}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpanded((p) => ({ ...p, [k]: !p[k] }))}
                >
                  <div className="dim-head">
                    <div className="dim-name">{label}</div>
                    {pctText && <div className="dim-pct">{pctText}</div>}
                  </div>
                  <div className="dim-score">{v != null ? v : ''}</div>
                  <div className="dim-bar">
                    <div className="dim-bar-fill" style={{ width: `${animate ? Math.min(100, Math.max(0, v || 0)) : 0}%` }} />
                  </div>
                  {isOpen && desc && <div className="dim-detail">{desc}</div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ===== 内在冲突 ===== */}
      {r.conflicts && r.conflicts.length > 0 && (
        <section className="report-section">
          <h3>{t('report.sec_conflicts')}</h3>
          <div className="conflict-list">
            {r.conflicts.map((c: Conflict, i) => {
              const sev = Math.min(3, Math.max(1, +c.severity || 1))
              const typeLabel = tOrNull(`report.conflict_labels.${c.conflict_type}`) || c.conflict_type
              return (
                <div className={`conflict-item sev-${sev}`} key={i}>
                  <div className="conflict-meta">
                    <span className="conflict-type">{typeLabel}</span>
                    <span className="conflict-dots">{'●'.repeat(sev)}{'○'.repeat(3 - sev)}</span>
                  </div>
                  <div className="conflict-desc">{c.description}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ===== 行为洞察 ===== */}
      <section className="report-section">
        <h3>{t('report.sec_insights')}</h3>
        <div className="insight-list">
          {INSIGHT_ORDER.filter((k) => r.insights && r.insights[k]).map((k) => {
            const v: Insight = r.insights[k]
            let extra: ReactNode = null
            if (k === 'courage_index' && typeof v.score === 'number') {
              extra = <div className="insight-bar"><div className="insight-bar-fill" style={{ width: `${animate ? v.score : 0}%` }} /></div>
            } else if (k === 'ambivalence' && typeof v.score === 'number') {
              extra = <div className="insight-bar"><div className="insight-bar-fill amber" style={{ width: `${animate ? v.score : 0}%` }} /></div>
            } else if (k === 'iat_bias' && typeof v.bias === 'number') {
              const magnitude = Math.min(100, Math.abs(v.bias) / 3)
              extra = <div className="insight-bar"><div className="insight-bar-fill violet" style={{ width: `${animate ? magnitude : 0}%` }} /></div>
            }
            const valLabel = (v.code && tOrNull(`report.insight_values.${k}.${v.code}`)) || v.label || ''
            const valDesc = (v.code && tOrNull(`report.insight_descs.${k}.${v.code}`)) || v.desc || ''
            return (
              <div className="insight-item" key={k}>
                <div className="insight-head">
                  <span className="insight-label">{tOrNull(`report.insight_labels.${k}`) || k}</span>
                  <span className="insight-value">{valLabel}</span>
                </div>
                <div className="insight-desc">{valDesc}</div>
                {extra}
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== 镜象名片 ===== */}
      <section className="mirror-card-share" aria-label={t('growth.card_cta')}>
        <div className="mcs-disc"><div className="mirror-disc" /></div>
        <div className="mcs-body">
          <div className="mcs-eyebrow">{eyebrow}</div>
          <h3 className="mcs-title">{subjectName}</h3>
          {poetic && <p className="mcs-poetic">{poetic}</p>}
          <Button variant="secondary" onClick={() => setShareOpen(true)}>{t('growth.card_cta')}</Button>
        </div>
      </section>

      {/* ===== 基于你的镜象(推荐) ===== */}
      {recoInner && (
        <section className="report-section growth-reco">
          <h3>{t('growth.reco_title')}</h3>
          <div className="reco-inner">{recoInner}</div>
        </section>
      )}

      {/* ===== 继续照见 ===== */}
      <section className="report-section growth-next">
        <h3>{t('growth.next_title')}</h3>
        <p className="growth-next-sub">{t('growth.next_sub')}</p>
        <div className="mirror-next-grid">
          {otherMirrors.map((m) => {
            const title = t<string>(`home.mirrors.${m.type}.title`) || m.type
            const tagline = t<string>(`home.mirrors.${m.type}.tagline`) || ''
            return (
              <Link className="mirror-next-card" to={`/take/${m.type}`} key={m.type}>
                <img className="mirror-next-icon" src={asset(`/images/mirror-${m.type}.svg`)} alt="" width={40} height={40} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <span className="mirror-next-title">{title}</span>
                {tagline && <span className="mirror-next-tagline">{tagline}</span>}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ===== 操作 ===== */}
      <div className="actions">
        <Button variant="primary" onClick={() => setShareOpen(true)}>{t('report.btn_share')}</Button>
        <Button variant="secondary" to={`/take/${type}`}>{t('report.btn_retake')}</Button>
        <Button variant="secondary" to="/">{t('report.back_home')}</Button>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} result={r} type={type} shareUrl={shareUrl} />
    </div>
  )
}
