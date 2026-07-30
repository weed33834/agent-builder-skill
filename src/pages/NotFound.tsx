/**
 * 404 页 —— 复刻原 404.html。破镜插画 + 404 + 文案 + 返回首页/名人志。
 * 增强:艺术字标题 + 渐变色 404 + 装饰背景。
 */
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { asset } from '@/lib/utils'
import { InkBlot, SealStamp, BrushStroke, FloatingParticles, CalligraphyColumn } from '@/components/ui/Ornaments'

export default function NotFound() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'notfound' })
  return (
    <div className="nf-wrap flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '70vh', position: 'relative', overflow: 'hidden' }}>
      <InkBlot style={{ position: 'absolute', top: '10%', left: '10%', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.4, zIndex: 0 }} />
      <InkBlot color="var(--mirror-value)" style={{ position: 'absolute', bottom: '10%', right: '10%', width: '260px', height: '260px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />
      <FloatingParticles style={{ position: 'absolute', top: '20%', left: '0', right: '0', width: '100%', height: '120px', pointerEvents: 'none', opacity: 0.5, zIndex: 0 }} />
      <CalligraphyColumn chars={['镜', '破', '难', '圆']} color="var(--accent)" style={{ position: 'absolute', top: '20px', left: '20px', width: '40px', height: '140px', opacity: 0.5, pointerEvents: 'none' }} />
      <CalligraphyColumn chars={['心', '向', '何', '方']} color="var(--mirror-value)" style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '140px', opacity: 0.5, pointerEvents: 'none' }} />

      <img src={asset('/images/404-broken-mirror.svg')} className="nf-illustration mb-6" style={{ position: 'relative', zIndex: 1 }} alt="" aria-hidden="true" />
      <div className="nf-code font-display leading-none mb-4" style={{ fontSize: 88, position: 'relative', zIndex: 1 }}>404</div>
      <h1 className="nf-title art-title text-[22px] text-ink mb-2" style={{ position: 'relative', zIndex: 1 }}>{t('notfound.title')}</h1>
      <p className="nf-sub text-sm text-ink-soft mb-6" style={{ maxWidth: 380, position: 'relative', zIndex: 1 }}>{t('notfound.sub')}</p>
      <BrushStroke style={{ width: '200px', height: '20px', marginBottom: '20px', opacity: 0.6, position: 'relative', zIndex: 1 }} />
      <div className="nf-actions flex gap-3" style={{ position: 'relative', zIndex: 1 }}>
        <Button to="/">{t('notfound.home')}</Button>
        <Button variant="link" to="/figures">{t('nav.figures')}</Button>
      </div>
      <SealStamp char="惑" style={{ position: 'absolute', bottom: '20px', right: '20px', width: '52px', height: '52px', opacity: 0.5, pointerEvents: 'none' }} />
    </div>
  )
}
