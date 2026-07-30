/**
 * 站点页脚 —— 复刻原 site-header.js 注入的 .site-footer。
 */
import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer mt-14 border-t border-line-soft bg-paper-faint">
      <div className="site-footer-inner mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-7 text-[13px] text-ink-faint" style={{ maxWidth: 720 }}>
        <div className="site-footer-brand font-serif text-ink-soft tracking-[0.04em]">心镜 · MindMirror</div>
        <nav className="site-footer-nav flex gap-5" aria-label="页脚导航">
          <Link to="/about" className="text-ink-soft hover:text-accent no-underline">{t('common.about_brand')}</Link>
          <Link to="/privacy" className="text-ink-soft hover:text-accent no-underline">{t('common.privacy')}</Link>
          <Link to="/auth" className="text-ink-soft hover:text-accent no-underline">{t('auth.tab_login')}</Link>
        </nav>
        <div className="site-footer-copy text-xs opacity-85">© 2026 心镜 MindMirror</div>
      </div>
    </footer>
  )
}
