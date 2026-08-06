/**
 * Galgame 资历测评报告页 —— 霓虹赛博主题(独立于三面镜的 Report.tsx)。
 *
 * 解码 ?r= base64 {type:'galgame', result},失败回退 useLastResultStore;均无则错误卡。
 * 结构:Hero(称号/总分)+ 维度雷达图(SVG 自绘)+ 维度详解卡 + 答题回顾(可折叠)+ 操作按钮。
 * 主题走 [data-galgame="1"],样式用 .neon-report-* 前缀。
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import confetti from 'canvas-confetti'
import { useDocumentMeta } from '@/lib/seo'
import { useI18n } from '@/lib/i18n'
import { play, vibrate } from '@/lib/audio'
import { toast } from '@/lib/toast'
import { useLastResultStore } from '@/store'
import { TopBar } from '@/components/layout/TopBar'
import {
  GALGAME_QUESTIONS,
  GALGAME_DIM_ORDER,
  GALGAME_DIM_LABEL,
  galgameMeta,
  type GalgameResult,
  type GalgameAnswer,
  type GalgameDim,
  type GalgameQuestion,
} from '@/data/galgame'

interface Decoded {
  type: 'galgame'
  result: GalgameResult
}

function decodeShare(raw: string): Decoded | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(raw))))
    if (obj && obj.type === 'galgame' && obj.result) {
      return { type: 'galgame', result: obj.result as GalgameResult }
    }
  } catch { /* 链接损坏 */ }
  return null
}

/** 维度 → 霓虹色 CSS 变量 */
const DIM_VAR: Record<GalgameDim, string> = {
  experience: 'var(--neon-dim-experience)',
  genre: 'var(--neon-dim-genre)',
  aesthetic: 'var(--neon-dim-aesthetic)',
  narrative: 'var(--neon-dim-narrative)',
  meme: 'var(--neon-dim-meme)',
}

/** 霓虹庆祝粒子色 */
const NEON_COLORS = ['#ff2d95', '#00f0ff', '#b8408b', '#c0ff3a', '#ffe600']

/** pct → 五档评价名 */
function tierOf(pct: number): string {
  if (pct < 20) return '萌新'
  if (pct < 40) return '入门'
  if (pct < 60) return '小资历'
  if (pct < 80) return '老资历'
  return '老司机'
}

/** 维度分档点评(有玩家社群人味,不堆空话) */
const DIM_COMMENT: Record<GalgameDim, string[]> = {
  // 顺序:萌新 / 入门 / 小资历 / 老资历 / 老司机
  experience: [
    '大门才推开一条缝,通关清单还得慢慢攒。',
    '通关过几部名作,硬盘里开始有迹可循。',
    '通关键堆得起来了,Key 社和型月都摸过一轮。',
    '通关清单能拉一长串,剧本家风格一眼能认。',
    '硬盘就是一部 Galgame 通关史,冷门佳作也藏了不少。',
  ],
  genre: [
    '还没摸清自己吃哪一口,先广撒网看看。',
    '开始知道自己偏爱哪种类型了。',
    '萌系、泣系、社会派都有涉猎,口味渐稳。',
    '各类型通吃,挑作品已经很有自己一套。',
    '萌豚也啃、社会派也推,来者不拒的杂食派。',
  ],
  aesthetic: [
    '还在认画风阶段,画师名多半对不上号。',
    '看到立绘能分出哪家社的风格。',
    '画师、原画师能数上几个,审美有了标尺。',
    '原画阵容一眼判优劣,审美已经成型。',
    '画师风格如数家珍,新老画师都能聊上两句。',
  ],
  narrative: [
    '共通线和个人线还分不太清。',
    '懂了共通线和个人线的套路。',
    '剧本结构能看出门道,伏笔回收也跟得上。',
    '剧本家风格了然于胸,叙事诡计瞒不过你。',
    'SCA-自的哲学、打越的诡计都嚼过,剧本门儿清。',
  ],
  meme: [
    '白学现场只能围观吃瓜,梗接不上。',
    '“又到了白色相簿的季节”能跟着乐了。',
    '名场面名台词能接上几句。',
    '梗的来龙去脉都清楚,接梗无压力。',
    '名台词名场面信手拈来,玩梗玩到飞起。',
  ],
}

function dimComment(dim: GalgameDim, pct: number): string {
  const idx = pct < 20 ? 0 : pct < 40 ? 1 : pct < 60 ? 2 : pct < 80 ? 3 : 4
  return DIM_COMMENT[dim][idx]
}

// ===================== 雷达图几何 =====================
const RADAR = { cx: 150, cy: 150, r: 96 }
const RADAR_RINGS = [0.25, 0.5, 0.75, 1]

/** 第 i 个维度在 -90° 起的极坐标点(给定 0~1 比例) */
function polar(i: number, ratio: number): { x: number; y: number } {
  const angle = (-90 + i * 72) * (Math.PI / 180)
  const rr = RADAR.r * ratio
  return { x: RADAR.cx + rr * Math.cos(angle), y: RADAR.cy + rr * Math.sin(angle) }
}

function pointsStr(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export default function GalgameReport() {
  const [searchParams] = useSearchParams()
  const lastResult = useLastResultStore((s) => s.result)
  const helmet = useDocumentMeta({ page: 'report', vars: { name: galgameMeta.title } })

  const decoded = useMemo<Decoded | null>(() => {
    const raw = searchParams.get('r') || lastResult || ''
    return raw ? decodeShare(raw) : null
  }, [searchParams, lastResult])

  const [animate, setAnimate] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  // Hero 称号打字机
  const [typed, setTyped] = useState('')

  const r = decoded?.result
  const title = r?.title

  // 题库 id→题 的查找表(答题回顾用)
  const qMap = useMemo(() => {
    const m = new Map<string, GalgameQuestion>()
    GALGAME_QUESTIONS.forEach((q) => { m.set(q.id, q) })
    return m
  }, [])

  // 主题标记 + 完成庆祝 + 打字机
  useEffect(() => {
    document.body.dataset.galgame = '1'
    if (!decoded || !title) return
    const name = title.name_zh
    const typingId = window.setTimeout(() => {
      let i = 0
      const iv = window.setInterval(() => {
        i += 1
        setTyped(name.slice(0, i))
        if (i >= name.length) window.clearInterval(iv)
      }, 90)
    }, 350)
    const celebId = window.setTimeout(() => {
      setAnimate(true)
      play('complete')
      vibrate([20, 30, 20])
      confetti({
        particleCount: 48, spread: 70, startVelocity: 32, gravity: 0.8,
        scalar: 0.85, ticks: 130, colors: NEON_COLORS,
        origin: { y: 0.35 }, disableForReducedMotion: true,
      })
      window.setTimeout(() => {
        confetti({
          particleCount: 30, spread: 90, startVelocity: 26, gravity: 0.9,
          scalar: 0.75, ticks: 110, colors: NEON_COLORS,
          origin: { y: 0.42 }, disableForReducedMotion: true,
        })
      }, 300)
    }, 650)
    return () => {
      window.clearTimeout(typingId)
      window.clearTimeout(celebId)
      delete document.body.dataset.galgame
    }
  }, [decoded, title])

  if (!decoded || !r || !title) {
    return (
      <>
        {helmet}
        <div className="neon-report-wrap">
          <TopBar sectionKey="common.error_generic" />
          <div className="neon-error">
            <div className="neon-title-emoji" aria-hidden="true">💾</div>
            <h2 className="neon-error-title">数据损坏 / DATA CORRUPTED</h2>
            <p className="neon-error-desc">这份报告的链接已失效或解析失败。重新测一遍,生成新的资历档案。</p>
            <Link className="neon-btn" to="/take-galgame">重新测评 →</Link>
          </div>
        </div>
      </>
    )
  }

  // 雷达数据点
  const dimStats = r.dim_stats
  const dataPts = GALGAME_DIM_ORDER.map((dim, i) => {
    const stat = dimStats.find((s) => s.dim === dim)
    return polar(i, (stat ? stat.pct : 0) / 100)
  })
  const dataStr = pointsStr(dataPts)

  // 答题回顾按维度分组
  const groupedAnswers = GALGAME_DIM_ORDER.map((dim) => ({
    dim,
    items: r.answers.filter((a) => a.dim === dim),
  }))

  const share = () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      navigator.clipboard?.writeText(url)
      toast('链接已复制,去拉人入坑')
    } catch {
      toast('链接已复制,去拉人入坑')
    }
  }

  return (
    <>
      {helmet}
      <div className="neon-report-wrap">
        <TopBar sectionKey="nav.galgame" />

      {/* ===== Hero ===== */}
      <section className="neon-hero">
        <div className="neon-hero-eyebrow">GALGAME 资历档案 // TIER {title.tier}</div>
        <span className="neon-title-emoji" aria-hidden="true">{title.emoji}</span>
        <h1 className="neon-title-name">
          {typed}
          {typed.length < title.name_zh.length && <span className="neon-title-cursor">▋</span>}
        </h1>
        <div className="neon-title-sub">
          <span>{title.name_en}</span>
          <span>{title.name_ja}</span>
        </div>
        <p className="neon-hero-blurb">{title.blurb_zh}</p>
        <div className="neon-hero-score">
          <span className="big">{r.total}</span>
          <span className="small">/ {r.max_total}</span>
          <span className="pct">{r.pct}%</span>
        </div>
      </section>

      {/* ===== 维度雷达 ===== */}
      <section className="neon-section">
        <h3 className="neon-section-title">维度雷达 / RADAR</h3>
        <div className="neon-radar">
          <svg viewBox="0 0 300 300" role="img" aria-label="五维度雷达图">
            {/* 同心网格 */}
            {RADAR_RINGS.map((ring) => {
              const pts = GALGAME_DIM_ORDER.map((_, i) => polar(i, ring))
              return <polygon key={ring} className="neon-radar-grid" points={pointsStr(pts)} />
            })}
            {/* 轴线 */}
            {GALGAME_DIM_ORDER.map((_, i) => {
              const p = polar(i, 1)
              return <line key={i} className="neon-radar-axis" x1={RADAR.cx} y1={RADAR.cy} x2={p.x} y2={p.y} />
            })}
            {/* 数据多边形(描边绘制动画 + 填充淡入) */}
            <motion.polygon
              className="neon-radar-poly"
              points={dataStr}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={animate ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ pathLength: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 0.6 } }}
            />
            {/* 顶点 */}
            {dataPts.map((p, i) => (
              <motion.circle
                key={i}
                className="neon-radar-vertex"
                cx={p.x} cy={p.y} r={3.5}
                initial={{ scale: 0 }}
                animate={animate ? { scale: 1 } : {}}
                transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 400, damping: 18 }}
              />
            ))}
            {/* 维度标签 + 百分比 */}
            {GALGAME_DIM_ORDER.map((dim, i) => {
              const stat = dimStats.find((s) => s.dim === dim)
              const lp = polar(i, 1.22)
              const anchor = lp.x > RADAR.cx + 8 ? 'start' : lp.x < RADAR.cx - 8 ? 'end' : 'middle'
              return (
                <g key={dim}>
                  <text
                    className="neon-radar-label"
                    x={lp.x} y={lp.y}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    style={{ fill: DIM_VAR[dim] }}
                  >
                    {GALGAME_DIM_LABEL[dim].zh}
                  </text>
                  <text
                    className="neon-radar-pct"
                    x={lp.x} y={lp.y + 14}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    style={{ fill: DIM_VAR[dim] }}
                  >
                    {stat ? `${stat.pct}%` : '0%'}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </section>

      {/* ===== 维度详解 ===== */}
      <section className="neon-section">
        <h3 className="neon-section-title">维度详解 / BREAKDOWN</h3>
        <div className="neon-dim-grid">
          {dimStats.map((stat, i) => {
            const label = GALGAME_DIM_LABEL[stat.dim]
            return (
              <motion.div
                key={stat.dim}
                className="neon-dim-card"
                style={{ '--dim-color': DIM_VAR[stat.dim] } as React.CSSProperties}
                initial={{ opacity: 0, y: 16 }}
                animate={animate ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              >
                <div className="neon-dim-card-head">
                  <div className="neon-dim-name">
                    {label.zh}
                    <span className="sub">{label.en} · {label.ja}</span>
                  </div>
                  <div className="neon-dim-score">
                    <span className="got">{stat.got}</span> / {stat.max}
                  </div>
                </div>
                <div className="neon-dim-bar">
                  <div
                    className="neon-dim-bar-fill"
                    style={{ width: `${animate ? stat.pct : 0}%` }}
                  />
                </div>
                <div className="neon-dim-comment">
                  {dimComment(stat.dim, stat.pct)}
                  <span className="neon-dim-tier">{tierOf(stat.pct)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ===== 答题回顾(可折叠) ===== */}
      <section className="neon-section" style={{ textAlign: 'center' }}>
        <button
          type="button"
          className={`neon-review-toggle${reviewOpen ? ' is-open' : ''}`}
          onClick={() => setReviewOpen((v) => !v)}
          aria-expanded={reviewOpen}
        >
          {reviewOpen ? '收起答题回顾' : '展开答题回顾'} <span className="arrow">▾</span>
        </button>
        <AnimatePresence initial={false}>
          {reviewOpen && (
            <motion.div
              key="review"
              className="neon-review-list"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {groupedAnswers.map(({ dim, items }) => {
                const label = GALGAME_DIM_LABEL[dim]
                return (
                  <div className="neon-review-group" key={dim} style={{ '--dim-color': DIM_VAR[dim] } as React.CSSProperties}>
                    <div className="neon-review-group-head">
                      <span className="neon-review-group-dot" />
                      <span>{label.zh} {label.en}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--neon-text-faint)' }}>{items.length}题</span>
                    </div>
                    {items.map((a: GalgameAnswer, idx) => {
                      const q = qMap.get(a.question_id)
                      const opt = q?.options.find((o) => o.id === a.option_id)
                      return (
                        <div className="neon-review-item" key={a.question_id || idx}>
                          <div className="neon-review-q">
                            <span className="idx">{a.question_id}</span>
                            <div className="body">
                              <div className="prompt">{q?.prompt || '(题目缺失)'}</div>
                              <div className="picked">
                                {opt?.text || '(选项缺失)'}
                                <span className="score">+{a.score}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ===== 操作 ===== */}
      <div className="neon-actions">
        <Link className="neon-btn" to="/take-galgame">再测一次 →</Link>
        <button type="button" className="neon-btn is-ghost" onClick={share}>分享链接</button>
        <Link className="neon-btn is-ghost" to="/section/entertainment">回板块</Link>
        <Link className="neon-btn is-pink" to="/">回首页</Link>
      </div>
    </div>
    </>
  )
}
