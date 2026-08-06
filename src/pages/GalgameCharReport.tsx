/**
 * Galgame 角色画像报告页 —— 霓虹赛博主题。
 *
 * 解码 ?r= base64 {type:'galgame-char', result:CharacterMatchResult[]},失败回退 useLastResultStore;
 * 均无则错误卡。
 * 结构:Top 1 角色展示(大图/角色名/出处/描述/性格标签)+ 匹配度排名列表(Top 1-12)+ 操作按钮。
 * 主题走 [data-galgame="1"],样式用 .neon-report-* 前缀。
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { useDocumentMeta } from '@/lib/seo'
import { play, vibrate } from '@/lib/audio'
import { toast } from '@/lib/toast'
import { useLastResultStore } from '@/store'
import { TopBar } from '@/components/layout/TopBar'
import { asset } from '@/lib/utils'
import {
  type CharacterMatchResult,
} from '@/data/galgame-characters'

interface Decoded {
  type: 'galgame-char'
  result: CharacterMatchResult[]
}

function decodeShare(raw: string): Decoded | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(raw))))
    if (obj && obj.type === 'galgame-char' && Array.isArray(obj.result) && obj.result.length > 0) {
      return { type: 'galgame-char', result: obj.result as CharacterMatchResult[] }
    }
  } catch { /* 链接损坏 */ }
  return null
}

/** 霓虹庆祝粒子色 */
const NEON_COLORS = ['#ff2d95', '#00f0ff', '#b8408b', '#c0ff3a', '#ffe600']

export default function GalgameCharReport() {
  const [searchParams] = useSearchParams()
  const lastResult = useLastResultStore((s) => s.result)
  const helmet = useDocumentMeta({ page: 'report', vars: { name: 'Galgame 角色画像' } })

  const decoded = useMemo<Decoded | null>(() => {
    const raw = searchParams.get('r') || lastResult || ''
    return raw ? decodeShare(raw) : null
  }, [searchParams, lastResult])

  const [animate, setAnimate] = useState(false)
  // Hero 称号打字机
  const [typed, setTyped] = useState('')

  const top1 = decoded?.result[0]
  const topChar = top1?.character

  // 主题标记 + 完成庆祝 + 打字机
  useEffect(() => {
    document.body.dataset.galgame = '1'
    if (!decoded || !topChar) return
    const name = topChar.name_zh
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
  }, [decoded, topChar])

  // 匹配度排名列表 (Top 1-12)
  const rankingList = useMemo(() => {
    if (!decoded) return []
    return decoded.result.slice(0, 12)
  }, [decoded])

  if (!decoded || !top1 || !topChar) {
    return (
      <>
        {helmet}
        <div className="neon-report-wrap">
          <TopBar sectionKey="common.error_generic" />
          <div className="neon-error">
            <div className="neon-title-emoji" aria-hidden="true">💾</div>
            <h2 className="neon-error-title">数据损坏 / DATA CORRUPTED</h2>
            <p className="neon-error-desc">这份角色画像的链接已失效或解析失败。重新测一遍，生成新的匹配档案。</p>
            <Link className="neon-btn" to="/take-galgame-char">重新测评 →</Link>
          </div>
        </div>
      </>
    )
  }

  const share = () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      navigator.clipboard?.writeText(url)
      toast('链接已复制,快去分享吧')
    } catch {
      toast('链接已复制,快去分享吧')
    }
  }

  return (
    <>
      {helmet}
      <div className="neon-report-wrap">
        <TopBar sectionKey="nav.galgame_char" />

      {/* ===== Hero: Top 1 角色展示 ===== */}
      <section className="neon-hero">
        <div className="neon-hero-eyebrow">GALGAME 角色画像 // MATCH {top1.rank}/{decoded.result.length}</div>
        <div className="neon-char-hero-img-wrap">
          <img
            src={asset(topChar.image)}
            alt={topChar.name_zh}
            className="neon-char-hero-img"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
        <h1 className="neon-title-name">
          {typed}
          {typed.length < topChar.name_zh.length && <span className="neon-title-cursor">▋</span>}
        </h1>
        <div className="neon-title-sub">
          <span>{topChar.name_en}</span>
          <span>{topChar.name_ja}</span>
        </div>
        <p className="neon-char-game">{topChar.game}</p>
        <p className="neon-hero-blurb">{topChar.description}</p>
        <div className="neon-char-tags">
          {topChar.personality.map((tag) => (
            <span key={tag} className="neon-char-tag">{tag}</span>
          ))}
        </div>
        <div className="neon-hero-score">
          <span className="big">{top1.percentage}</span>
          <span className="small">%</span>
          <span className="pct">匹配度</span>
        </div>
      </section>

      {/* ===== 匹配度排名列表 ===== */}
      <section className="neon-section">
        <h3 className="neon-section-title">匹配度排名 / RANKING</h3>
        <div className="neon-char-ranking">
          {rankingList.map((item, i) => {
            const char = item.character
            const isTop = i === 0
            return (
              <motion.div
                key={char.id}
                className={`neon-char-rank-item${isTop ? ' is-top' : ''}`}
                initial={{ opacity: 0, x: -16 }}
                animate={animate ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.35 }}
              >
                <span className="neon-char-rank-num">#{item.rank}</span>
                <div className="neon-char-rank-avatar-wrap">
                  <img
                    src={asset(char.image)}
                    alt={char.name_zh}
                    className="neon-char-rank-avatar"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div className="neon-char-rank-info">
                  <span className="neon-char-rank-name">{char.name_zh}</span>
                  <span className="neon-char-rank-game">{char.game}</span>
                </div>
                <div className="neon-char-rank-bar-wrap">
                  <div className="neon-char-rank-bar-track">
                    <div
                      className="neon-char-rank-bar-fill"
                      style={{ width: `${animate ? item.percentage : 0}%` }}
                    />
                  </div>
                  <span className="neon-char-rank-pct">{item.percentage}%</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ===== 操作 ===== */}
      <div className="neon-actions">
        <Link className="neon-btn" to="/take-galgame-char">再测一次 →</Link>
        <button type="button" className="neon-btn is-ghost" onClick={share}>分享链接</button>
        <Link className="neon-btn is-ghost" to="/section/entertainment">回板块</Link>
        <Link className="neon-btn is-pink" to="/">回首页</Link>
      </div>
    </div>
    </>
  )
}