/**
 * 音效引擎 —— 移植自原项目 static/audio.js。
 * Web Audio API 现场合成水墨质感音(墨滴/钤印/古琴泛音),零音频文件依赖。
 * 静音状态走 Zustand(useMuteStore),持久化沿用原 key mindmirror_muted。
 *
 * 必须在用户手势内创建/恢复 AudioContext(浏览器自动播放策略),故懒加载 + 首手势监听。
 */
import { useMuteStore } from '@/store'

type SfxName = 'select' | 'tap' | 'section' | 'submit' | 'complete' | 'ink' | 'cave' | 'seal' | 'error'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ensureCtx(): AudioContext | null {
  if (ctx) {
    if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume() } catch { /* noop */ } }
    return ctx
  }
  const AC: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  } catch { ctx = null }
  return ctx
}

// 首个手势内恢复 AudioContext
function onFirstGesture() {
  const c = ensureCtx()
  if (c && c.state === 'suspended' && c.resume) { try { c.resume() } catch { /* noop */ } }
  window.removeEventListener('pointerdown', onFirstGesture)
  window.removeEventListener('keydown', onFirstGesture)
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', onFirstGesture)
  window.addEventListener('keydown', onFirstGesture)
}

function t0(): number { return ctx!.currentTime }

interface ToneOpts {
  type?: OscillatorType; freq: number; slideTo?: number; dur?: number
  gain?: number; attack?: number; filter?: BiquadFilterType; filterFreq?: number
}
function tone(o: ToneOpts) {
  if (!ctx || !master) return
  const s = t0()
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = o.type || 'sine'
  osc.frequency.setValueAtTime(o.freq, s)
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), s + (o.dur || 0.2))
  const peak = o.gain == null ? 0.2 : o.gain
  const atk = o.attack == null ? 0.005 : o.attack
  const dur = o.dur || 0.2
  g.gain.setValueAtTime(0.0001, s)
  g.gain.exponentialRampToValueAtTime(peak, s + atk)
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
  if (o.filter) {
    const f = ctx.createBiquadFilter()
    f.type = o.filter; f.frequency.value = o.filterFreq || 800
    osc.connect(f); f.connect(g)
  } else {
    osc.connect(g)
  }
  g.connect(master)
  osc.start(s)
  osc.stop(s + dur + 0.05)
}

interface NoiseOpts { from?: number; to?: number; dur?: number; gain?: number }
function noiseBurst(o: NoiseOpts) {
  if (!ctx || !master) return
  const dur = o.dur || 0.2
  const s = t0()
  const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * dur)), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = ctx.createBufferSource(); src.buffer = buf
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'
  f.frequency.setValueAtTime(o.from || 1200, s)
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.to), s + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(o.gain || 0.15, s)
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
  src.connect(f); f.connect(g); g.connect(master)
  src.start(s); src.stop(s + dur + 0.02)
}

const SFX: Record<SfxName, () => void> = {
  select: () => tone({ type: 'triangle', freq: 680, slideTo: 520, dur: 0.12, gain: 0.16 }),
  tap: () => tone({ type: 'sine', freq: 520, dur: 0.07, gain: 0.12 }),
  section: () => {
    tone({ type: 'sine', freq: 392, dur: 0.18, gain: 0.18 })
    setTimeout(() => tone({ type: 'sine', freq: 523, dur: 0.22, gain: 0.18 }), 110)
  },
  submit: () => {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => tone({ type: 'sine', freq: f, dur: 0.16, gain: 0.16 }), i * 70)
    })
  },
  complete: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => tone({ type: 'sine', freq: f, dur: 0.5, gain: 0.2, attack: 0.01 }), i * 120)
    })
    noiseBurst({ from: 2000, to: 300, dur: 0.5, gain: 0.06 })
  },
  ink: () => {
    noiseBurst({ from: 1400, to: 200, dur: 0.35, gain: 0.10 })
    tone({ type: 'sine', freq: 180, slideTo: 90, dur: 0.3, gain: 0.10 })
  },
  cave: () => tone({ type: 'sine', freq: 200, slideTo: 520, dur: 0.5, gain: 0.14 }),
  seal: () => {
    tone({ type: 'sine', freq: 130, slideTo: 80, dur: 0.25, gain: 0.2 })
    noiseBurst({ from: 900, to: 120, dur: 0.18, gain: 0.12 })
  },
  error: () => tone({ type: 'sawtooth', freq: 170, dur: 0.18, gain: 0.14, filter: 'lowpass', filterFreq: 500 }),
}

/** 播放音效:静音态直接返回。供非组件场景使用。 */
export function play(name: SfxName) {
  if (useMuteStore.getState().muted) return
  if (!ensureCtx()) return
  if (ctx!.state === 'suspended') { try { ctx!.resume() } catch { /* noop */ } }
  const fn = SFX[name]
  if (fn) { try { fn() } catch { /* noop */ } }
}

export function vibrate(pattern: number | number[]) {
  try { if (navigator.vibrate) navigator.vibrate(pattern) } catch { /* noop */ }
}

/** 庆祝:完成音 + 粒子 + 轻震动(报告显现时调用)。粒子用自绘墨花兜底,零外部依赖。 */
export function celebrate(colors: string[] = ['#8b2e1f', '#c9a14a', '#3a4a52', '#f4efe3', '#b5482f']) {
  play('complete')
  vibrate([30, 40, 60])
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return
  selfBurst(colors)
}

function selfBurst(colors: string[]) {
  try {
    const c = document.createElement('canvas')
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;'
    document.body.appendChild(c)
    const g = c.getContext('2d')!
    const size = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    size(); window.addEventListener('resize', size)
    const parts: { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number }[] = []
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6
      parts.push({ x: window.innerWidth / 2, y: window.innerHeight * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 1, col: colors[i % colors.length], r: 3 + Math.random() * 4 })
    }
    let last = performance.now()
    const frame = (t: number) => {
      const dt = (t - last) / 16.7; last = t
      g.clearRect(0, 0, c.width, c.height)
      let alive = false
      for (const p of parts) {
        p.vy += 0.15 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.012 * dt
        if (p.life > 0) {
          alive = true; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill()
        }
      }
      if (alive) requestAnimationFrame(frame)
      else { c.remove(); window.removeEventListener('resize', size) }
    }
    requestAnimationFrame(frame)
  } catch { /* noop */ }
}
