/**
 * 站点头部 —— 极简设计
 * 左:Logo"心镜"链接到首页
 * 中:导航链接(全部测评 / 名人志 / 关于)
 * 右:UserMenu + LangSwitch
 * 移动端:汉堡菜单 + 右侧滑出抽屉
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { UserMenu } from './UserMenu'
import { LangSwitch } from './LangSwitch'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const { t } = useI18n()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // 路由变化时关闭抽屉
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname, location.search])

  // 抽屉打开时阻止 body 滚动
  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [navOpen])

  const navLinks = [
    { to: '/sections', label: t('nav.all_sections') },
    { to: '/figures', label: t('nav.figures') },
    { to: '/about', label: t('common.about') },
  ]

  return (
    <header className="site-header sticky top-0 z-[100] bg-paper/92 backdrop-blur border-b border-line-soft">
      <div className="mx-auto flex items-center gap-6 px-6 h-14" style={{ maxWidth: 1200 }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 no-underline">
          <span className="font-display text-lg font-medium tracking-[0.06em] text-ink">心镜</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-1 flex-1" aria-label={t('common.main_nav')}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 text-[13px] tracking-[0.08em] rounded no-underline transition-colors',
                  isActive
                    ? 'text-accent font-medium'
                    : 'text-ink-faint hover:text-ink hover:bg-paper-soft',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* 右侧区域 */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden md:flex items-center gap-2">
            <UserMenu />
            <LangSwitch />
          </div>

          {/* 移动端汉堡按钮 */}
          <button
            type="button"
            className="md:hidden text-2xl text-ink p-1 leading-none"
            aria-label={t('common.menu')}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? '×' : '☰'}
          </button>
        </div>
      </div>

      {/* 移动端抽屉遮罩 + 面板 */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setNavOpen(false)}
            />
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-14 right-0 bottom-0 w-72 bg-paper border-l border-line-soft z-50 md:hidden shadow-xl"
            >
              <nav className="flex flex-col gap-1 p-4" aria-label={t('common.main_nav')}>
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        'px-3.5 py-2.5 text-[13px] tracking-[0.08em] rounded no-underline transition-colors',
                        isActive
                          ? 'text-accent font-medium bg-accent-soft'
                          : 'text-ink-faint hover:text-ink hover:bg-paper-soft',
                      )
                    }
                    onClick={() => setNavOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="border-t border-line-soft my-3" />
                <div className="px-3.5 py-1">
                  <UserMenu />
                </div>
                <div className="px-3.5 py-2">
                  <LangSwitch inHeader={false} />
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}