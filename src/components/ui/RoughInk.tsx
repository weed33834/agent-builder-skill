/**
 * RoughInk —— 用 rough.js 生成的手绘水墨风装饰。
 * 输出 SVG,可作为背景或角标,与宣纸 × 墨的美学契合。
 * 每个组件内部用 useMemo 稳定 SVG 字符串,避免重新渲染抖动。
 *
 * 注意:roughjs 的 RoughSVG API 直接返回 SVGGElement,故我们调用
 * rc.circle() 等方法后直接读取 outerHTML 即可。
 */
import { useMemo, type CSSProperties } from 'react'
import rough from 'roughjs'

type RoughProps = { className?: string; style?: CSSProperties; color?: string; seed?: number }

function toHTML(g: SVGGElement): string {
  return g.outerHTML
}

/* 解析 CSS 变量为实际颜色(rough 需要实色,不支持 var()) */
function resolveColor(c: string): string {
  if (!c.startsWith('var(')) return c
  // 常见变量映射到主题实色
  const map: Record<string, string> = {
    'var(--accent)': '#8b2e1f',
    'var(--ink)': '#1a1714',
    'var(--ink-soft)': '#4a453e',
    'var(--ink-faint)': '#6f6a60',
    'var(--ink-ghost)': '#8f8975',
    'var(--mirror-celebrity)': '#8b6a2e',
    'var(--mirror-value)': '#4a6b5c',
    'var(--mirror-ideology)': '#3a5670',
    'var(--mirror)': '#8b6a2e',
  }
  return map[c] || '#8b2e1f'
}

function makeSvg(): { svg: SVGSVGElement; rc: ReturnType<typeof rough.svg> } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  return { svg, rc: rough.svg(svg) }
}

/* 手绘圆环 —— 多重抖动的墨圈,适合做主角标识 */
export function RoughCircle({ className, style, color = 'var(--accent)', seed = 1 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    const g1 = rc.circle(50, 50, 80, { stroke: real, strokeWidth: 1.4, roughness: 1.8, seed, bowing: 1 })
    const g2 = rc.circle(50, 50, 92, { stroke: real, strokeWidth: 0.8, roughness: 2.4, seed: seed + 1, bowing: 1.5 })
    const g3 = rc.circle(50, 50, 60, { stroke: real, strokeWidth: 0.6, roughness: 2.0, seed: seed + 2 })
    return [g1, g2, g3].map(toHTML).join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/* 手绘方框 —— 抖动的方形边框,印章感 */
export function RoughSquare({ className, style, color = 'var(--accent)', seed = 3 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    const g1 = rc.rectangle(8, 8, 84, 84, { stroke: real, strokeWidth: 1.6, roughness: 1.6, seed, bowing: 1.2 })
    const g2 = rc.rectangle(14, 14, 72, 72, { stroke: real, strokeWidth: 0.7, roughness: 2.2, seed: seed + 4 })
    return [g1, g2].map(toHTML).join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/* 手绘远山 —— 三层远山线条,适合横幅装饰 */
export function RoughMountain({ className, style, color = 'var(--ink-soft)', seed = 7 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    const g1 = rc.path('M0,60 L40,30 L70,50 L110,18 L150,46 L185,30 L215,48 L255,22 L290,42 L325,28 L360,46 L400,32 L400,80 L0,80 Z',
      { stroke: real, strokeWidth: 1.2, roughness: 1.4, seed, fill: real, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 4, hachureAngle: 45 })
    const g2 = rc.path('M0,68 L50,52 L90,62 L140,40 L180,58 L220,46 L260,60 L300,42 L340,56 L400,46 L400,80 L0,80 Z',
      { stroke: real, strokeWidth: 0.9, roughness: 1.6, seed: seed + 2, fill: real, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 5, hachureAngle: 45 })
    return [g1, g2].map(toHTML).join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 400 80" preserveAspectRatio="none" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/* 手绘星图 —— 随机散布的小墨点与连线,题量大时点缀 */
export function RoughConstellation({ className, style, color = 'var(--ink-soft)', seed = 11 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    // 用确定性 LCG 生成 7 颗"星"
    let s = seed
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const pts: [number, number][] = []
    for (let i = 0; i < 7; i++) pts.push([20 + rand() * 160, 10 + rand() * 60])
    // 连线
    let path = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) path += ` L${pts[i][0]},${pts[i][1]}`
    const gLine = rc.path(path, { stroke: real, strokeWidth: 0.5, roughness: 1.2, seed })
    const out = [toHTML(gLine)]
    // 星点
    pts.forEach((p, i) => {
      const r = 1.6 + (i % 3) * 0.6
      const g = rc.circle(p[0], p[1], r * 2, { stroke: real, strokeWidth: 0.8, roughness: 1.8, seed: seed + i, fill: real, fillStyle: 'solid' })
      out.push(toHTML(g))
    })
    return out.join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 200 80" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/* 手绘阴阳 —— 简化阴阳图,适合道家符号 */
export function RoughYinYang({ className, style, color = 'var(--ink-soft)', seed = 19 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    const g1 = rc.circle(50, 50, 90, { stroke: real, strokeWidth: 1.4, roughness: 1.8, seed })
    const g2 = rc.path('M50,5 A45,45 0 0,1 50,95 A22.5,22.5 0 0,1 50,50 A22.5,22.5 0 0,0 50,5 Z',
      { stroke: real, strokeWidth: 1.2, roughness: 1.6, seed: seed + 3, fill: real, fillStyle: 'solid' })
    const g3 = rc.circle(50, 27.5, 8, { stroke: real, strokeWidth: 1, roughness: 1.4, seed: seed + 5, fill: '#f4efe3', fillStyle: 'solid' })
    const g4 = rc.circle(50, 72.5, 8, { stroke: real, strokeWidth: 1, roughness: 1.4, seed: seed + 7, fill: real, fillStyle: 'solid' })
    return [g1, g2, g3, g4].map(toHTML).join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/* 手绘折扇 —— rough 风格的折扇,比 SVG 版更有水墨笔意 */
export function RoughFan({ className, style, color = 'var(--accent)', seed = 23 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    // 扇面弧
    const g1 = rc.path('M4,56 A56,56 0 0,1 116,56 Z',
      { stroke: real, strokeWidth: 1.4, roughness: 1.5, seed, fill: real, fillStyle: 'hachure', fillWeight: 0.4, hachureGap: 3, hachureAngle: 60 })
    const out = [toHTML(g1)]
    // 扇骨
    for (let i = 0; i <= 8; i++) {
      const ang = -50 + i * 12.5
      const rad = ang * Math.PI / 180
      const x = 60 + Math.cos(rad - Math.PI / 2) * 54
      const y = 56 + Math.sin(rad - Math.PI / 2) * 54
      const g = rc.line(60, 56, x, y, { stroke: real, strokeWidth: 0.6, roughness: 1.2, seed: seed + i })
      out.push(toHTML(g))
    }
    const g2 = rc.circle(60, 56, 6, { stroke: real, strokeWidth: 1, roughness: 1.5, seed: seed + 11, fill: real, fillStyle: 'solid' })
    out.push(toHTML(g2))
    return out.join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 120 64" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/* 手绘莲花 —— 三朵莲花的连续装饰 */
export function RoughLotus({ className, style, color = 'var(--mirror)', seed = 29 }: RoughProps) {
  const html = useMemo(() => {
    const { rc } = makeSvg()
    const real = resolveColor(color)
    const out: string[] = []
    // 莲花瓣 (五瓣)
    const drawLotus = (cx: number, cy: number, s: number, sd: number) => {
      // 中心瓣
      out.push(toHTML(rc.path(`M${cx},${cy} Q${cx - s * 0.5},${cy - s * 1.8} ${cx},${cy - s * 2.2} Q${cx + s * 0.5},${cy - s * 1.8} ${cx},${cy} Z`,
        { stroke: real, strokeWidth: 0.6, roughness: 1.4, seed: sd, fill: real, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 2 })))
      // 左右瓣
      out.push(toHTML(rc.path(`M${cx},${cy - s * 0.4} Q${cx - s * 1.4},${cy - s * 1.4} ${cx - s * 1.6},${cy - s * 0.2} Q${cx - s * 0.6},${cy - s * 0.2} ${cx},${cy - s * 0.4} Z`,
        { stroke: real, strokeWidth: 0.5, roughness: 1.5, seed: sd + 1, fill: real, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 2 })))
      out.push(toHTML(rc.path(`M${cx},${cy - s * 0.4} Q${cx + s * 1.4},${cy - s * 1.4} ${cx + s * 1.6},${cy - s * 0.2} Q${cx + s * 0.6},${cy - s * 0.2} ${cx},${cy - s * 0.4} Z`,
        { stroke: real, strokeWidth: 0.5, roughness: 1.5, seed: sd + 2, fill: real, fillStyle: 'hachure', fillWeight: 0.3, hachureGap: 2 })))
    }
    drawLotus(40, 30, 10, seed)
    drawLotus(110, 30, 10, seed + 10)
    drawLotus(180, 30, 10, seed + 20)
    // 水线
    out.push(toHTML(rc.line(0, 32, 220, 32, { stroke: real, strokeWidth: 0.5, roughness: 1.6, seed: seed + 30 })))
    return out.join('')
  }, [color, seed])
  return (
    <svg className={className} style={style} viewBox="0 0 220 36" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
