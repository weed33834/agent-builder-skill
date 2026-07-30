/**
 * 分享弹窗 —— 移植自原 report.js openShareModal + buildShareCard。
 * 链接复制 + Canvas 水墨分享卡生成 + 下载。Canvas 走 2x DPR 高清绘制。
 */
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/lib/toast'
import { asset } from '@/lib/utils'
import type { ComputeResult, AssessmentType, Match } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  result: ComputeResult
  type: AssessmentType
  shareUrl: string
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
): number {
  const chars = String(text).split('')
  let line = ''
  let yy = y
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      ctx.fillText(line, x, yy)
      line = ch
      yy += lh
    } else {
      line += ch
    }
  }
  if (line) ctx.fillText(line, x, yy)
  return yy
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(img)
    img.src = src
  })
}

/** 生成分享卡 Canvas,返回 dataURL 与 canvas 元素 */
async function buildShareCard(
  result: ComputeResult,
  type: AssessmentType,
  t: <T = string>(key: string, vars?: Record<string, string | number>) => T,
): Promise<HTMLCanvasElement> {
  const top: Match | null = (result.matches && result.matches[0]) || null
  const W = 720
  const H = 1280
  const S = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * S
  canvas.height = H * S
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.scale(S, S)

  const paper = cssVar('--paper-faint', '#f8f5ee')
  const accent = cssVar('--accent', '#8b2e1f')
  const ink = cssVar('--ink', '#2a2620')
  const inkSoft = cssVar('--ink-soft', '#4a453e')
  const inkFaint = cssVar('--ink-faint', '#8a857c')

  // 背景 + 顶部色带
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, W, 12)

  ctx.textAlign = 'center'
  ctx.fillStyle = accent
  ctx.font = "600 26px 'Noto Serif SC', serif"
  ctx.fillText('心 · 镜', W / 2, 70)
  ctx.fillStyle = inkFaint
  ctx.font = "400 18px 'Noto Sans SC', sans-serif"
  ctx.fillText('MindMirror', W / 2, 100)

  const cx = W / 2
  const cy = 320
  const rad = 150

  // 圆形头像(有图裁切,无图落色块)
  const photoSrc = top ? asset(top.photo || top.image || '') : ''
  let img: HTMLImageElement | null = null
  if (photoSrc) {
    img = await loadImage(photoSrc)
  }
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (img && img.complete && img.naturalWidth) {
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const side = Math.min(iw, ih)
    const sx = (iw - side) / 2
    const sy = (ih - side) / 2
    ctx.drawImage(img, sx, sy, side, side, cx - rad, cy - rad, rad * 2, rad * 2)
  } else {
    ctx.fillStyle = cssVar('--paper-soft', '#efe9da')
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
  }
  ctx.restore()
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.stroke()

  // 姓名 + 匹配度
  const titleInfo = t<{ title: string }>(`report.titles.${type}`)
  const subjectName = top ? top.name : (titleInfo?.title || '')
  ctx.fillStyle = ink
  ctx.font = "700 44px 'Noto Serif SC', serif"
  ctx.fillText(subjectName, W / 2, cy + rad + 56)

  if (top && top.match_pct != null) {
    ctx.fillStyle = accent
    ctx.font = "600 30px 'Noto Sans SC', sans-serif"
    ctx.fillText(`${top.match_pct}%`, W / 2, cy + rad + 100)
  }

  // 标签
  const tags = (result.profile && result.profile.tags) || []
  if (tags.length) {
    ctx.font = "400 20px 'Noto Sans SC', sans-serif"
    ctx.fillStyle = inkSoft
    ctx.fillText(tags.slice(0, 4).join(' · '), W / 2, cy + rad + 142)
  }

  // 摘要(左对齐换行)
  if (result.summary) {
    ctx.fillStyle = inkSoft
    ctx.font = "400 21px 'Noto Sans SC', sans-serif"
    ctx.textAlign = 'left'
    wrapText(ctx, result.summary, 60, cy + rad + 200, W - 120, 32)
  }

  // 底部落款
  ctx.fillStyle = inkFaint
  ctx.textAlign = 'center'
  ctx.font = "400 18px 'Noto Sans SC', sans-serif"
  ctx.fillText('心镜 MindMirror', W / 2, H - 60)

  return canvas
}

export function ShareModal({ open, onClose, result, type, shareUrl }: Props) {
  const { t } = useI18n()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [copied, setCopied] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // 关闭时重置
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null)
      setCopied(false)
    }
  }, [open])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast(t('common.error_generic'), 'error')
    }
  }

  const handleBuild = async () => {
    setBuilding(true)
    try {
      const canvas = await buildShareCard(result, type, t)
      setPreviewUrl(canvas.toDataURL('image/png'))
    } catch {
      toast(t('common.error_generic'), 'error')
    } finally {
      setBuilding(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `mindmirror-${type}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div
      ref={overlayRef}
      className="share-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="share-modal" style={{ maxWidth: 420 }}>
        <button
          type="button"
          className="share-close"
          aria-label="close"
          onClick={onClose}
          style={{
            position: 'absolute',
            background: 'none',
            border: 'none',
            fontSize: 24,
            color: cssVar('--ink-faint', '#8a857c'),
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <h3>{t('report.btn_share')}</h3>

        <div className="share-label" style={{ fontSize: 13, color: cssVar('--ink-soft', '#4a453e'), marginBottom: 8, letterSpacing: '0.08em' }}>
          {t('common.your_mirror')}
        </div>
        <div className="share-link-row" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="share-link-input"
            type="text"
            readOnly
            value={shareUrl}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '8px 10px',
              border: `1px solid ${cssVar('--line', '#d0c9ba')}`,
              borderRadius: 6,
              background: cssVar('--paper-faint', '#f8f5ee'),
              color: cssVar('--ink-soft', '#4a453e'),
              fontSize: 12,
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" className="btn-secondary" onClick={handleCopy} style={{ margin: 0, padding: '8px 14px' }}>
            {copied ? '✓' : t('common.confirm')}
          </button>
        </div>

        <button type="button" className="btn-primary" onClick={handleBuild} disabled={building} style={{ margin: 0, width: '100%' }}>
          {building ? t('common.processing') : t('growth.card_cta')}
        </button>

        {previewUrl && (
          <div className="share-card-preview" style={{ marginTop: 16 }}>
            <img
              src={previewUrl}
              alt="share card"
              style={{ width: '100%', borderRadius: 8, display: 'block', border: `1px solid ${cssVar('--line', '#d0c9ba')}` }}
            />
            <button type="button" className="btn-primary" onClick={handleDownload} style={{ margin: '12px 0 0', width: '100%' }}>
              {t('common.confirm')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
