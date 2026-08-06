/**
 * 答题 / 报告页独立顶部条 —— 站点头部不进入这些聚焦态路由,
 * 但用户需要一个清晰的位置感(我在哪、能回哪)。
 *
 * 设计:
 * - 桌面端:左 logo + 简短面包屑,右动作区(返回首页 / 语言切换)
 * - 移动端:左 logo + 简短页名 + 返回按钮
 * - 视觉:极简、克制,与 hero 背景的宣纸色一致
 */
import { Link, NavLink } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { asset, cn } from '@/lib/utils'
import { LangSwitch } from './LangSwitch'

interface TopBarProps {
  /** 当前路由的简短页名(i18n key) */
  sectionKey: string
  /** 动作按钮区(可选) */
  children?: React.ReactNode
}

export function TopBar({ sectionKey, children }: TopBarProps) {
  const { t } = useI18n()

  return (
    <header className="focused-topbar sticky top-0 z-[100] bg-paper/92 backdrop-blur border-b border-line-soft">
      <div className="focused-topbar-inner mx-auto flex items-center gap-3 px-4 sm:px-6 h-12" style={{ maxWidth: 1080 }}>
        <Link to="/" className="flex items-center gap-2 shrink-0 no-underline" aria-label={t('common.back_home')}>
          <img src={asset('/images/logo-mark.jpg')} alt="" width={22} height={22} aria-hidden="true" />
          <span className="font-display text-[15px] font-medium tracking-[0.08em] text-ink">{t('home.brand')}</span>
        </Link>

        <span className="text-ink-ghost mx-1 select-none" aria-hidden="true">·</span>
        <span className="hidden sm:inline text-[12px] tracking-[0.18em] uppercase text-ink-faint">{t(sectionKey)}</span>

        <div className="ml-auto flex items-center gap-2">
          {children}
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'topbar-back inline-flex items-center gap-1 px-2.5 py-1 text-[12px] tracking-[0.08em] rounded no-underline',
                isActive ? 'text-accent font-medium' : 'text-ink-faint hover:text-ink hover:bg-paper-soft',
              )
            }
            aria-label={t('common.back_home')}
          >
            <span aria-hidden="true">←</span>
            <span>{t('common.back_home')}</span>
          </NavLink>
          <LangSwitch />
        </div>
      </div>
    </header>
  )
}
