/**
 * 站点头部 —— 复刻原 site-header.js 注入的 .site-header。
 * 含品牌、移动端汉堡、主导航(测评下拉 + 名人志)、语言切换。
 * 答题页(/take)不渲染头部,由路由 Layout 控制。
 */
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { assessments } from '@/lib/data'
import { LangSwitch } from './LangSwitch'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const { t } = useI18n()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 当前是否在答题上下文(下拉触发按钮高亮)
  const inTake = location.pathname.startsWith('/take')

  // 路由变化时收起菜单
  useEffect(() => {
    setDropdownOpen(false)
    setNavOpen(false)
  }, [location.pathname, location.search])

  // 点击外部 / Escape 关闭下拉
  useEffect(() => {
    if (!dropdownOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false) }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

  return (
    <header className="site-header sticky top-0 z-[100] bg-paper/92 backdrop-blur border-b border-line-soft">
      <div className="site-header-inner mx-auto flex items-center gap-6 px-6 h-14" style={{ maxWidth: 1200 }}>
        <Link to="/" className="brand flex items-center gap-2 shrink-0 no-underline">
          <img src="/images/logo.svg" alt="心镜" width={28} height={28} />
          <span className="brand-name font-display text-lg font-medium tracking-[0.06em] text-ink">心镜</span>
        </Link>

        <button
          type="button"
          className="nav-toggle hidden text-xl text-ink p-1"
          aria-label={t('common.menu')}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          ☰
        </button>

        <nav className="primary-nav flex gap-1 flex-1 overflow-x-auto" aria-label={t('common.main_nav')}>
          {/* 测评下拉 */}
          <div className="nav-dropdown relative" ref={dropdownRef}>
            <button
              type="button"
              className={cn(
                'nav-dropdown-trigger inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer px-3.5 py-1.5 text-[13px] tracking-[0.08em] rounded',
                inTake ? 'text-accent font-medium' : 'text-ink-faint hover:text-ink',
              )}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span>{t('common.assessments')}</span>
              <span className="caret text-[10px] opacity-60">▾</span>
            </button>
            {dropdownOpen && (
              <div className="nav-dropdown-panel absolute top-full left-0 min-w-[184px] bg-paper-faint border border-line rounded-md p-1.5 flex flex-col gap-0.5 z-[200] shadow-lg">
                {assessments.map((a) => (
                  <NavLink
                    key={a.type}
                    to={`/take/${a.type}`}
                    className="nav-link px-3.5 py-1.5 text-[13px] tracking-[0.08em] text-ink-faint hover:text-ink hover:bg-paper-soft rounded no-underline"
                  >
                    {t(`nav.${a.type}`)}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* 名人志 */}
          <NavLink
            to="/figures"
            className={({ isActive }) =>
              cn(
                'nav-link inline-block px-3.5 py-1.5 text-[13px] tracking-[0.08em] rounded no-underline',
                isActive ? 'text-accent font-medium' : 'text-ink-faint hover:text-ink hover:bg-paper-soft',
              )
            }
          >
            {t('nav.figures')}
          </NavLink>
        </nav>

        <LangSwitch />
      </div>
    </header>
  )
}
