/**
 * 按钮组件 —— 复刻原项目 .btn-primary / .btn-secondary / .btn-link 三种样式。
 * 三种渲染:有 to 渲染 <Link>(SPA 内跳)、有 href 渲染 <a>(外链/全量)、否则 <button>。
 */
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'link'

const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] font-display tracking-[0.12em] ' +
  'transition-all duration-200 ease-ink select-none cursor-pointer no-underline'

const variants: Record<Variant, string> = {
  primary: 'btn-primary bg-accent text-paper-soft px-8 py-3 text-sm hover:brightness-110 hover:-translate-y-0.5 hover:shadow-md',
  secondary: 'btn-secondary bg-transparent border border-line text-ink-soft px-8 py-3 text-sm hover:border-ink-soft hover:text-ink',
  link: 'btn-link border border-line-soft text-ink-soft px-6 py-2 text-xs hover:text-accent hover:border-accent',
}

interface CommonProps {
  variant?: Variant
  className?: string
  children: ReactNode
}

type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined }
type LinkProps = CommonProps & { to: string; href?: undefined }
type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; to?: undefined }

export function Button(props: AnchorProps | LinkProps | ButtonProps) {
  const { variant = 'primary', className, children, ...rest } = props
  const cls = cn(base, variants[variant], className)
  if ('to' in props && props.to !== undefined) {
    return (
      <Link className={cls} to={props.to} {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)}>
        {children}
      </Link>
    )
  }
  if ('href' in props && props.href !== undefined) {
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    )
  }
  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
