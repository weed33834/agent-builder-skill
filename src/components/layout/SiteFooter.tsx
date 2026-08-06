/**
 * 站点页脚 —— 极简设计
 * 左:版权信息
 * 中:链接(关于 / 隐私政策)
 * 右:语言切换
 */
import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { LangSwitch } from './LangSwitch'

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer mt-14 border-t border-line-soft bg-paper-faint">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-6 text-[13px] text-ink-faint" style={{ maxWidth: 1200 }}>
        <div className="text-xs opacity-70">
          © 2026 心镜
        </div>
        <nav className="flex gap-5" aria-label={t('common.main_nav')}>
          <Link to="/about" className="text-ink-soft hover:text-accent no-underline transition-colors">{t('common.about')}</Link>
          <Link to="/privacy" className="text-ink-soft hover:text-accent no-underline transition-colors">{t('common.privacy')}</Link>
        </nav>
        <LangSwitch inHeader={false} />
      </div>
    </footer>
  )
}