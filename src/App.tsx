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
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query'
import { MainLayout } from '@/components/layout/MainLayout'
import Home from '@/pages/Home'
import NotFound from '@/pages/NotFound'

const Figures = lazy(() => import('@/pages/Figures'))
const Figure = lazy(() => import('@/pages/Figure'))
const About = lazy(() => import('@/pages/About'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Sections = lazy(() => import('@/pages/Sections'))
const SectionDetail = lazy(() => import('@/pages/SectionDetail'))
const Auth = lazy(() => import('@/pages/Auth'))
const Take = lazy(() => import('@/pages/Take'))
const Report = lazy(() => import('@/pages/Report'))
const TakeGalgame = lazy(() => import('@/pages/TakeGalgame'))
const GalgameReport = lazy(() => import('@/pages/GalgameReport'))
const TakeGalgameChar = lazy(() => import('@/pages/TakeGalgameChar'))
const GalgameCharReport = lazy(() => import('@/pages/GalgameCharReport'))
const Profile = lazy(() => import('@/pages/Profile'))
const MyAssessments = lazy(() => import('@/pages/MyAssessments'))
const Settings = lazy(() => import('@/pages/Settings'))

function RouteFallback() {
  return (
    <div className="loading-overlay" style={{ position: 'fixed', minHeight: '60vh' }}>
      <div className="mirror-disc" />
    </div>
  )
}

// basename 跟随 vite base:本地 '/',GitHub Pages '/mindmirror'。去掉末尾斜杠以符合 RR 约定。
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={routerBasename}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="sections" element={<Sections />} />
                <Route path="section/:id" element={<SectionDetail />} />
                <Route path="auth" element={<Auth />} />
                <Route path="figures" element={<Figures />} />
                <Route path="figure/:id" element={<Figure />} />
                <Route path="about" element={<About />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="profile" element={<Profile />} />
                <Route path="my-assessments" element={<MyAssessments />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="take/:type" element={<Take />} />
              <Route path="report/:type" element={<Report />} />
              <Route path="take-galgame" element={<TakeGalgame />} />
              <Route path="take-galgame-char" element={<TakeGalgameChar />} />
              <Route path="report-galgame" element={<GalgameReport />} />
              <Route path="report-galgame-char" element={<GalgameCharReport />} />
            </Routes>
          </Suspense>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                fontFamily: "'Noto Serif SC', 'Noto Serif JP', 'Noto Serif', serif",
                fontSize: '13px',
                background: '#2a2620',
                color: '#f4efe3',
                border: '1px solid rgba(244,239,227,0.15)',
                borderRadius: '8px',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  )
}