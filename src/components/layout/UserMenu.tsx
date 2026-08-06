/**
 * 用户菜单 —— 登录/注册按钮 + 已登录下拉菜单
 * 未认证:显示"登录/注册"按钮
 * 已认证:显示头像首字母 + 下拉菜单(个人资料/我的测评/设置/退出)
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function UserMenu() {
  const { t } = useI18n()
  const { user, isAuthenticated, signOut, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部 / Escape 关闭
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
  }

  const avatarLetter = user?.email?.charAt(0).toUpperCase() || '?'
  const displayName = user?.user_metadata?.full_name || user?.email || ''

  if (loading) {
    return <div className="w-8 h-8 rounded-full skeleton" />
  }

  if (!isAuthenticated) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] tracking-[0.08em] rounded no-underline text-ink-faint hover:text-ink hover:bg-paper-soft transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>{t('auth.tab_login')}</span>
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-pointer border-0 bg-transparent',
          open ? 'bg-paper-soft' : 'hover:bg-paper-soft',
        )}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-medium font-display select-none">
          {avatarLetter}
        </div>
        <svg
          className={cn('w-3 h-3 text-ink-faint transition-transform duration-200', open && 'rotate-180')}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1.5 w-48 bg-paper border border-line rounded-lg shadow-lg py-1 z-50"
          >
            <div className="px-3.5 py-2 text-xs text-ink-faint border-b border-line-soft truncate">
              {displayName}
            </div>
            <Link
              to="/profile"
              className="block px-3.5 py-2 text-[13px] text-ink hover:bg-paper-soft no-underline transition-colors"
              onClick={() => setOpen(false)}
            >
              个人资料
            </Link>
            <Link
              to="/my-assessments"
              className="block px-3.5 py-2 text-[13px] text-ink hover:bg-paper-soft no-underline transition-colors"
              onClick={() => setOpen(false)}
            >
              我的测评
            </Link>
            <Link
              to="/settings"
              className="block px-3.5 py-2 text-[13px] text-ink hover:bg-paper-soft no-underline transition-colors"
              onClick={() => setOpen(false)}
            >
              设置
            </Link>
            <div className="border-t border-line-soft my-1" />
            <button
              type="button"
              className="block w-full text-left px-3.5 py-2 text-[13px] text-ink-faint hover:text-accent hover:bg-paper-soft transition-colors cursor-pointer border-0 bg-transparent"
              onClick={handleSignOut}
            >
              退出登录
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}