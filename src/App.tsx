/**
 * 路由根 —— MainLayout 包裹静态页(含 header/footer/mute);
 * /take 与 /report 走独立全屏路由(聚焦态,无全局框)。
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import { MainLayout } from '@/components/layout/MainLayout'
import Home from '@/pages/Home'
import Figures from '@/pages/Figures'
import Figure from '@/pages/Figure'
import About from '@/pages/About'
import Privacy from '@/pages/Privacy'
import Take from '@/pages/Take'
import Report from '@/pages/Report'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}
