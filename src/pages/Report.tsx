/**
 * 报告页 —— 移植自原 report.js。
 * 解码 ?r= (base64 {type,result}),失败回退 localStorage 最近结果;均无则错误卡。
 * 渲染:hero(镜面/标题/标签/摘要) + 核心匹配 + 维度详解(雷达图+下钻) +
 *      内在冲突 + 行为洞察 + 增长区块(镜象名片/推荐/继续照见) + 操作按钮 + 分享弹窗。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { useLastResultStore } from '@/store'
import { play, vibrate } from '@/lib/audio'
import { Button } from '@/components/ui/Button'
import { RadarChart } from '@/components/RadarChart'
import { ShareModal } from '@/components/ShareModal'
import { asset } from '@/lib/utils'
import {
  InkBlot,
  SealStamp,
  CalligraphyColumn,
  BrushStroke,
  ScrollDivider,
  AuspiciousCloud,
  MeanderBorder,
  LotusPattern,
  MoonPhases,
  TrinityMirror,
  MountainLayers,
} from '@/components/ui/Ornaments'
import { RoughCircle, RoughConstellation } from '@/components/ui/RoughInk'
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
      // 克制的朱墨飞溅:仅 2 次,颜色限定三镜色 + 朱墨,数量少,契合东方美学
      const colors = ['#8b2e1f', '#8b6a2e', '#4a6b5c', '#3a5670', '#c0954a']
      confetti({
        particleCount: 36,
        spread: 60,
        startVelocity: 28,
        gravity: 0.85,
        scalar: 0.8,
        ticks: 120,
        colors,
        origin: { y: 0.35 },
        shapes: ['circle'],
        disableForReducedMotion: true,
      })
      window.setTimeout(() => {
        confetti({
          particleCount: 22,
          spread: 80,
          startVelocity: 22,
          gravity: 0.9,
          scalar: 0.7,
          ticks: 100,
          colors,
          origin: { y: 0.4 },
          shapes: ['circle'],
          disableForReducedMotion: true,
        })
      }, 280)
    }, 650)
    return () => {
      window.clearTimeout(id)
      delete document.body.dataset.mirror
    }
  }, [type])

  if (!decoded || !type || !r) {
    return (
      <div className="container" style={{ maxWidth: 560, padding: '120px 40px', textAlign: 'center', position: 'relative' }}>
        <InkBlot color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '-40px', width: '280px', height: '280px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />
        <InkBlot color="var(--mirror-value)" style={{ position: 'absolute', bottom: '20px', left: '-40px', width: '240px', height: '240px', pointerEvents: 'none', opacity: 0.25, zIndex: 0 }} />
        <CalligraphyColumn chars={['镜', '破', '难', '圆']} color="var(--accent)" style={{ position: 'absolute', top: '40px', left: '20px', width: '40px', height: '140px', opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} />
        <div className="result-error" style={{ position: 'relative', zIndex: 1 }}>
          <div className="result-error-seal">印</div>
          <h3 className="result-error-title art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('report.error_title')}</h3>
          <p className="result-error-desc">{t('report.error_desc')}</p>
          <BrushStroke color="var(--accent)" style={{ width: '180px', height: '20px', margin: '16px auto', opacity: 0.5 }} />
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
    <div className="container" style={{ maxWidth: 860, position: 'relative' }}>
      {/* 全局背景装饰:水墨晕染 */}
      <InkBlot color="var(--mirror)" style={{ position: 'absolute', top: '40px', right: '-80px', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />
      <InkBlot color="var(--mirror)" style={{ position: 'absolute', top: '600px', left: '-80px', width: '260px', height: '260px', pointerEvents: 'none', opacity: 0.2, zIndex: 0 }} />

      {/* 书法竖排装饰,填补左右空白 */}
      <CalligraphyColumn chars={['明', '镜', '照', '心']} color="var(--mirror)" style={{ position: 'absolute', top: '60px', left: '0px', width: '40px', height: '140px', opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} />
      <CalligraphyColumn chars={['真', '我', '如', '见']} color="var(--accent)" style={{ position: 'absolute', top: '60px', right: '0px', width: '40px', height: '140px', opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} />

      {/* ===== Hero ===== */}
      <div className="report-hero" style={{ position: 'relative', zIndex: 1 }}>
        <SealStamp char="镜" color="var(--mirror)" style={{ position: 'absolute', top: '12px', right: '12px', width: '52px', height: '52px', opacity: 0.5, pointerEvents: 'none' }} />
        {/* rough.js 手绘圆环,围绕镜面 */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
          <RoughCircle color="var(--mirror)" seed={type === 'celebrity' ? 101 : type === 'value' ? 202 : 303} style={{ position: 'absolute', top: '-12px', left: '-12px', width: 'calc(100% + 24px)', height: 'calc(100% + 24px)', pointerEvents: 'none', opacity: 0.5 }} />
          <div className="mirror-disc" {...(clarity ? { 'data-clarity': clarity } : {})} />
        </div>
        <div className="report-eyebrow">{titleInfo.eyebrow}</div>
        <h2 className="report-title art-title" style={{ fontFamily: 'var(--font-art)' }}>{titleInfo.title}</h2>
        <div className="hero-divider"><span /></div>
        {tags.length ? (
          <div className="profile-tags">
            {tags.map((tag, i) => <span className="profile-tag" key={i}>{tag}</span>)}
          </div>
        ) : (
          <p className="profile-empty">{t('report.tags_empty')}</p>
        )}
        <p className="report-summary">{r.summary}</p>
        {/* 飘带 */}
        <BrushStroke color="var(--mirror)" style={{ width: '180px', height: '20px', margin: '16px auto 0', opacity: 0.4 }} />
      </div>

      {/* 装饰条:回纹边框 */}
      <div style={{ textAlign: 'center', margin: '24px 0 32px', position: 'relative', zIndex: 1 }}>
        <MeanderBorder color="var(--mirror)" style={{ width: '100%', maxWidth: '400px', height: '12px' }} />
      </div>

      {/* ===== 核心匹配 ===== */}
      <section className="report-section" style={{ position: 'relative', zIndex: 1 }}>
        <h3 className="art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('report.sec_matches')}</h3>
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
        <section className="report-section" style={{ position: 'relative', zIndex: 1 }}>
          <h3 className="art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('report.sec_dimensions')}</h3>
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

      {/* 莲瓣纹分隔装饰 */}
      <div style={{ textAlign: 'center', margin: '32px 0', position: 'relative', zIndex: 1, opacity: 0.6 }}>
        <LotusPattern color="var(--mirror)" style={{ width: '280px', height: '60px' }} />
      </div>

      {/* ===== 内在冲突 ===== */}
      {r.conflicts && r.conflicts.length > 0 && (
        <section className="report-section" style={{ position: 'relative', zIndex: 1 }}>
          <h3 className="art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('report.sec_conflicts')}</h3>
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

      {/* 卷轴分隔装饰 */}
      <div style={{ textAlign: 'center', margin: '32px 0', position: 'relative', zIndex: 1 }}>
        <ScrollDivider color="var(--mirror)" style={{ width: '280px', height: '16px' }} />
      </div>

      {/* ===== 行为洞察 ===== */}
      <section className="report-section" style={{ position: 'relative', zIndex: 1 }}>
        <h3 className="art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('report.sec_insights')}</h3>
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

      {/* 月相图装饰,代表"自我周期" */}
      <div style={{ textAlign: 'center', margin: '32px 0', position: 'relative', zIndex: 1, opacity: 0.6 }}>
        <MoonPhases color="var(--mirror)" style={{ width: '280px', height: '28px' }} />
      </div>

      {/* ===== 镜象名片 ===== */}
      <section className="mirror-card-share" aria-label={t('growth.card_cta')} style={{ position: 'relative', overflow: 'visible' }}>
        <AuspiciousCloud color="var(--mirror)" style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', width: '140px', height: '40px', opacity: 0.4, pointerEvents: 'none' }} />
        <div className="mcs-disc"><div className="mirror-disc" /></div>
        <div className="mcs-body">
          <div className="mcs-eyebrow">{eyebrow}</div>
          <h3 className="mcs-title art-title" style={{ fontFamily: 'var(--font-art)' }}>{subjectName}</h3>
          {poetic && <p className="mcs-poetic art-brush" style={{ fontFamily: 'var(--font-crazy)' }}>{poetic}</p>}
          <Button variant="secondary" onClick={() => setShareOpen(true)}>{t('growth.card_cta')}</Button>
        </div>
      </section>

      {/* ===== 基于你的镜象(推荐) ===== */}
      {recoInner && (
        <section className="report-section growth-reco" style={{ position: 'relative', zIndex: 1 }}>
          <h3 className="art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('growth.reco_title')}</h3>
          <div className="reco-inner">{recoInner}</div>
          {/* 手绘星图,代表"你的星图" */}
          <RoughConstellation color="var(--mirror)" seed={type === 'celebrity' ? 41 : type === 'value' ? 42 : 43} style={{ width: '100%', maxWidth: '400px', height: '80px', margin: '16px auto 0', opacity: 0.5 }} />
        </section>
      )}

      {/* ===== 继续照见 ===== */}
      <section className="report-section growth-next" style={{ position: 'relative', zIndex: 1 }}>
        <h3 className="art-title" style={{ fontFamily: 'var(--font-art)' }}>{t('growth.next_title')}</h3>
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
        {/* 三镜合一装饰 */}
        <div style={{ textAlign: 'center', marginTop: '24px', opacity: 0.5 }}>
          <TrinityMirror style={{ width: '160px', height: '60px' }} />
        </div>
      </section>

      {/* 远山层叠底部装饰 */}
      <MountainLayers color="var(--ink-ghost)" style={{ width: '100%', maxWidth: '600px', height: '80px', margin: '24px auto 0', display: 'block', position: 'relative', zIndex: 1 }} />

      {/* ===== 操作 ===== */}
      <div className="actions" style={{ position: 'relative', zIndex: 1 }}>
        <Button variant="primary" onClick={() => setShareOpen(true)}>{t('report.btn_share')}</Button>
        <Button variant="secondary" to={`/take/${type}`}>{t('report.btn_retake')}</Button>
        <Button variant="secondary" to="/">{t('report.back_home')}</Button>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} result={r} type={type} shareUrl={shareUrl} />
    </div>
  )
}
