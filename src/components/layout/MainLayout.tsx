/**
 * 主布局 —— 含站点头部、页脚、静音按钮。答题页(/take)走独立无框布局,不经过此处。
 * 使用 AnimatedOutlet 包装 Outlet 实现页面过渡动画。
 */
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { MuteBtn } from './MuteBtn'

const EASE = [0.22, 1, 0.36, 1] as const

export function MainLayout() {
  const location = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <SiteFooter />
      <MuteBtn />
    </div>
  )
}
