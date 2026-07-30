/**
 * 404 页 —— 复刻原 404.html。破镜插画 + 404 + 文案 + 返回首页/名人志。
 */
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { asset } from '@/lib/utils'

export default function NotFound() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'notfound' })
  return (
    <div className="nf-wrap flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '70vh' }}>
      <img src={asset('/images/404-broken-mirror.svg')} className="nf-illustration mb-6" alt="" aria-hidden="true" />
      <div className="nf-code font-display text-ink-ghost leading-none mb-4" style={{ fontSize: 88 }}>404</div>
      <h1 className="nf-title text-[22px] text-ink mb-2">{t('notfound.title')}</h1>
      <p className="nf-sub text-sm text-ink-soft mb-6" style={{ maxWidth: 380 }}>{t('notfound.sub')}</p>
      <div className="nf-actions flex gap-3">
        <Button to="/">{t('notfound.home')}</Button>
        <Button variant="link" to="/figures">{t('nav.figures')}</Button>
      </div>
    </div>
  )
}
