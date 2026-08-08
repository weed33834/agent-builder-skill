/**
 * 路由根 —— MainLayout 包裹静态页(含 header/footer/mute);
 * /take 与 /report 走独立全屏路由(聚焦态,无全局框)。
 *
 * 路由级代码分割:除 Home(首屏 LCP)与 NotFound(catch-all,体积极小)外,
 * 其余页面均懒加载,避免把 Figures/Take/Report(含 echarts)打进首屏 bundle。
 */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { AnimatePresence, motion } from 'motion/react'
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
      <motion.div
        className="mirror-disc"
        animate={{ rotate: 360, opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

/** 页面过渡包装:为每个独立路由添加淡入动画 */
function AnimatedOutlet({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
              <Route path="take/:type" element={<AnimatedOutlet><Take /></AnimatedOutlet>} />
              <Route path="report/:type" element={<AnimatedOutlet><Report /></AnimatedOutlet>} />
              <Route path="take-galgame" element={<AnimatedOutlet><TakeGalgame /></AnimatedOutlet>} />
              <Route path="take-galgame-char" element={<AnimatedOutlet><TakeGalgameChar /></AnimatedOutlet>} />
              <Route path="report-galgame" element={<AnimatedOutlet><GalgameReport /></AnimatedOutlet>} />
              <Route path="report-galgame-char" element={<AnimatedOutlet><GalgameCharReport /></AnimatedOutlet>} />
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