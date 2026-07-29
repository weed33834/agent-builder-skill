/**
 * 头像组件 —— 复刻原项目 .onthisday-portrait 的图片兜底逻辑:
 * 先试 src(优先 photo),失败回退 fallback(image),再失败显示"镜"字剪影。
 */
import { useState, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PortraitProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src: string
  fallback?: string
  alt: string
  size?: number
  className?: string
}

export function Portrait({ src, fallback, alt, size = 72, className }: PortraitProps) {
  const [stage, setStage] = useState<'primary' | 'fallback' | 'placeholder'>('primary')
  const current = stage === 'primary' ? src : stage === 'fallback' && fallback ? fallback : ''

  if (stage === 'placeholder' || !current) {
    return (
      <div
        className={cn('mm-portrait mm-portrait-fallback flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        aria-label={alt}
        role="img"
      >
        <span className="text-ink-ghost font-serif" style={{ fontSize: size * 0.4 }}>镜</span>
      </div>
    )
  }

  return (
    <div className={cn('mm-portrait', className)} style={{ width: size, height: size }}>
      <img
        src={current}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        onError={() => {
          if (stage === 'primary' && fallback && fallback !== src) setStage('fallback')
          else setStage('placeholder')
        }}
      />
    </div>
  )
}
