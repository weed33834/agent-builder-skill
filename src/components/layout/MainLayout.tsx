/**
 * 主布局 —— 含站点头部、页脚、静音按钮。答题页(/take)走独立无框布局,不经过此处。
 */
import { Outlet } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { MuteBtn } from './MuteBtn'

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <MuteBtn />
    </div>
  )
}
