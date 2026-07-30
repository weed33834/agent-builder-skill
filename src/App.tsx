/**
 * 路由根 —— MainLayout 包裹静态页(含 header/footer/mute);
 * /take 与 /report 走独立全屏路由(聚焦态,无全局框)。
 *
 * 路由级代码分割:除 Home(首屏 LCP)与 NotFound(catch-all,体积极小)外,
 * 其余页面均懒加载,避免把 Figures/Take/Report(含 echarts)打进首屏 bundle。
 */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import { MainLayout } from '@/components/layout/MainLayout'
import Home from '@/pages/Home'
import NotFound from '@/pages/NotFound'

const Figures = lazy(() => import('@/pages/Figures'))
const Figure = lazy(() => import('@/pages/Figure'))
const About = lazy(() => import('@/pages/About'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Take = lazy(() => import('@/pages/Take'))
const Report = lazy(() => import('@/pages/Report'))

function RouteFallback() {
  return (
    <div className="loading-overlay" style={{ position: 'fixed', minHeight: '60vh' }}>
      <div className="mirror-disc" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="figures" element={<Figures />} />
              <Route path="figure/:id" element={<Figure />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="take/:type" element={<Take />} />
            <Route path="report/:type" element={<Report />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
