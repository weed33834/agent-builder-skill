/**
 * 名人卡片 —— 复刻原项目 .onthisday-card,首页/列表/详情相关推荐共用。
 * 头像 + 姓名 + 生卒 + 简介(可选)。链接到 /figure/:id。
 */
import { Link } from 'react-router-dom'
import type { Celebrity } from '@/lib/types'
import { Portrait } from './Portrait'
import { cn } from '@/lib/utils'

interface FigureCardProps {
  figure: Celebrity
  showBlurb?: boolean
  size?: number
  className?: string
}

export function FigureCard({ figure, showBlurb = true, size = 72, className }: FigureCardProps) {
  return (
    <Link
      to={`/figure/${figure.id}`}
      className={cn('onthisday-card block', className)}
    >
      <Portrait
        src={figure.photo || figure.image}
        fallback={figure.image}
        alt={figure.name}
        size={size}
        className="onthisday-portrait mx-auto"
      />
      <div className="onthisday-name font-serif text-ink">{figure.name}</div>
      {figure.era && <div className="onthisday-era font-num text-ink-faint">{figure.era}</div>}
      {showBlurb && figure.blurb && (
        <div className="onthisday-blurb text-ink-soft">{figure.blurb}</div>
      )}
    </Link>
  )
}
