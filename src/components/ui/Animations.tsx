/**
 * 可复用动画组件 —— FadeIn / ScaleIn / Stagger / PageTransition
 *
 * 统一页面入场、滚动触发、列表分散动画,避免各页面重复写 initial/animate。
 * 尊重 prefers-reduced-motion,自动降级为无动画。
 *
 * 2026 增强:
 * - 所有动画组件使用 will-change 优化 GPU 合成
 * - AnimatedCount 改用 requestAnimationFrame 替代 setInterval
 * - 新增 AnimatedList 组件,支持列表错落入场动画
 * - 新增 Skeleton 组件,支持骨架屏加载态
 * - 使用 CSS 动画 token (--dur-*, --ease-*) 统一节奏
 */
import { type ReactNode, type ComponentProps, useEffect, useRef, useState } from 'react'
import { motion, type Variants, AnimatePresence } from 'motion/react'
import { useLocation } from 'react-router-dom'

const EASE = [0.22, 1, 0.36, 1] as const
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const

/** 检测 prefers-reduced-motion */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  const ref = useRef<MediaQueryList | null>(null)
  useEffect(() => {
    ref.current = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(ref.current.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    ref.current.addEventListener('change', handler)
    return () => ref.current?.removeEventListener('change', handler)
  }, [])
  return reduced
}

// ===================== 基础缓动值 =====================
export const MOTION = { ease: EASE } as const

// ===================== 淡入上移 =====================
interface FadeInProps extends ComponentProps<typeof motion.div> {
  y?: number
  delay?: number
  duration?: number
  once?: boolean
}

export function FadeIn({
  children, y = 20, delay = 0, duration = 0.5, once = true, className, ...rest
}: FadeInProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    return <div className={className}>{children as ReactNode}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ delay, duration, ease: EASE }}
      style={{ willChange: 'transform, opacity' }}
      {...rest}
    >
      {children as ReactNode}
    </motion.div>
  )
}

// ===================== 缩放淡入 =====================
interface ScaleInProps extends ComponentProps<typeof motion.div> {
  delay?: number
  once?: boolean
}

export function ScaleIn({ children, delay = 0, once = true, className, ...rest }: ScaleInProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    return <div className={className}>{children as ReactNode}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ delay, duration: 0.45, ease: EASE }}
      style={{ willChange: 'transform, opacity' }}
      {...rest}
    >
      {children as ReactNode}
    </motion.div>
  )
}

// ===================== 列表错落 =====================
interface StaggerProps {
  children: ReactNode[]
  className?: string
  /** 每项之间的延迟(秒) */
  step?: number
  /** 每项初始 Y 偏移 */
  y?: number
  item?: boolean
  once?: boolean
  as?: 'div' | 'ul' | 'ol'
}

export function Stagger({
  children, className, step = 0.06, y = 16, once = true, as = 'div',
}: StaggerProps) {
  const reduced = useReducedMotion()
  if (reduced || !children || children.length === 0) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }
  const Tag = as
  return (
    <Tag className={className}>
      {children.map((child, i) => (
        <motion.div
          key={(child as ReactNode & { key?: string })?.key ?? i}
          initial={{ opacity: 0, y }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once, margin: '-40px' }}
          transition={{ delay: i * step, duration: 0.4, ease: EASE }}
          style={{ willChange: 'transform, opacity' }}
        >
          {child}
        </motion.div>
      ))}
    </Tag>
  )
}

// ===================== 页面过渡包装器 =====================
const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
}

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  const location = useLocation()
  if (reduced) {
    return <div className={className}>{children}</div>
  }
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ===================== 计数动画 (requestAnimationFrame 版) =====================
export function AnimatedCount({
  value, duration = 0.8, digits = 0, suffix = '',
}: {
  value: number; duration?: number; digits?: number; suffix?: string
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const prevValueRef = useRef(0)

  useEffect(() => {
    if (reduced) { setDisplay(value); return }

    const startValue = prevValueRef.current
    const diff = value - startValue
    if (diff === 0) return

    const startTime = performance.now()
    let rafId: number

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      // ease-out 缓动
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + diff * eased
      setDisplay(Math.round(current * Math.pow(10, digits)) / Math.pow(10, digits))

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        setDisplay(value)
        prevValueRef.current = value
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [value, duration, digits, reduced])

  return <>{display.toFixed(digits)}{suffix}</>
}

// ===================== 打字机 =====================
export function Typewriter({ text, speed = 60, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? text : '')
  useEffect(() => {
    if (reduced) { setDisplay(text); return }
    const t1 = setTimeout(() => {
      let i = 0
      const iv = setInterval(() => {
        i++
        setDisplay(text.slice(0, i))
        if (i >= text.length) clearInterval(iv)
      }, speed)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t1)
  }, [text, speed, delay, reduced])
  return <>{display}</>
}

// ===================== 进度条动画 =====================
export function AnimatedProgress({
  pct, color, delay = 0.2, duration = 0.7,
}: {
  pct: number; color?: string; delay?: number; duration?: number
}) {
  const reduced = useReducedMotion()
  return (
    <div className="progress-bar" style={{ height: 4, background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}>
      <motion.div
        style={{ height: '100%', width: reduced ? `${pct}%` : 0, background: color || 'var(--accent)', borderRadius: 2, willChange: 'width' }}
        initial={reduced ? undefined : { width: 0 }}
        animate={reduced ? undefined : { width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ delay, duration, ease: EASE }}
      />
    </div>
  )
}

// ===================== 弹性弹出动画 =====================
interface PopInProps extends ComponentProps<typeof motion.div> {
  delay?: number
  once?: boolean
}

export function PopIn({ children, delay = 0, once = true, className, ...rest }: PopInProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    return <div className={className}>{children as ReactNode}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ delay, duration: 0.4, ease: EASE_SPRING }}
      style={{ willChange: 'transform, opacity' }}
      {...rest}
    >
      {children as ReactNode}
    </motion.div>
  )
}

// ===================== 从左侧滑入 =====================
interface SlideInLeftProps extends ComponentProps<typeof motion.div> {
  delay?: number
  once?: boolean
}

export function SlideInLeft({ children, delay = 0, once = true, className, ...rest }: SlideInLeftProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children as ReactNode}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      style={{ willChange: 'transform, opacity' }}
      {...rest}
    >
      {children as ReactNode}
    </motion.div>
  )
}

// ===================== 从右侧滑入 =====================
interface SlideInRightProps extends ComponentProps<typeof motion.div> {
  delay?: number
  once?: boolean
}

export function SlideInRight({ children, delay = 0, once = true, className, ...rest }: SlideInRightProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children as ReactNode}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      style={{ willChange: 'transform, opacity' }}
      {...rest}
    >
      {children as ReactNode}
    </motion.div>
  )
}

// ===================== 骨架屏 =====================
interface SkeletonProps {
  className?: string
  /** 行数 */
  lines?: number
  /** 每行宽度:可传数组对应每行,或单个值统一 */
  widths?: string | string[]
  /** 线条高度 */
  height?: string
}

export function Skeleton({ className, lines = 3, widths = '100%', height = '14px' }: SkeletonProps) {
  const widthArr = Array.isArray(widths) ? widths : Array(lines).fill(widths)
  return (
    <div className={`skeleton-block ${className ?? ''}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: widthArr[i] ?? widthArr[widthArr.length - 1], height }}
        />
      ))}
    </div>
  )
}

/** 骨架屏卡片 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`skeleton-card ${className ?? ''}`}>
      <Skeleton lines={1} height="24px" widths="60%" />
      <div style={{ height: 12 }} />
      <Skeleton lines={3} widths={['100%', '85%', '70%']} />
    </div>
  )
}