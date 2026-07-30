/**
 * 飘墨粒子背景 —— 纯 Canvas 实现的轻量动画,无需第三方库。
 * 在宣纸底色上飘动少量朱墨色墨点,营造水墨意境,克制不喧宾。
 * 遵守 prefers-reduced-motion:用户偏好减少动效时不启动。
 */
import { useEffect, useRef, type CSSProperties } from 'react'

interface InkParticle {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  alpha: number
  pulse: number
  colorIdx: number
}

const COLORS = ['rgba(139,46,31,', 'rgba(139,106,46,', 'rgba(74,107,92,', 'rgba(58,86,112,']

interface InkCanvasProps {
  className?: string
  style?: CSSProperties
  particleCount?: number
}

export function InkCanvas({ className, style, particleCount = 14 }: InkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let rafId = 0
    const particles: InkParticle[] = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const initParticles = () => {
      particles.length = 0
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 1.5 + Math.random() * 3.5,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          alpha: 0.1 + Math.random() * 0.22,
          pulse: Math.random() * Math.PI * 2,
          colorIdx: Math.floor(Math.random() * COLORS.length),
        })
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.pulse += 0.02
        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20
        if (p.y < -20) p.y = height + 20
        if (p.y > height + 20) p.y = -20
        const breath = 0.6 + 0.4 * Math.sin(p.pulse)
        const a = p.alpha * breath
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6)
        grad.addColorStop(0, `${COLORS[p.colorIdx]}${(a * 0.7).toFixed(3)})`)
        grad.addColorStop(0.5, `${COLORS[p.colorIdx]}${(a * 0.2).toFixed(3)})`)
        grad.addColorStop(1, `${COLORS[p.colorIdx]}0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `${COLORS[p.colorIdx]}${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      rafId = window.requestAnimationFrame(render)
    }

    resize()
    initParticles()
    render()

    const onResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      resize()
      initParticles()
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [particleCount])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      aria-hidden="true"
    />
  )
}
