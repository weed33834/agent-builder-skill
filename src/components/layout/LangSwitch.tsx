/**
 * 语言切换器 —— 复刻原项目 .lang-switch,中/EN/日 三按钮。
 * 挂在 header 右侧(.in-header 静态定位)。
 */
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/store'
import { cn } from '@/lib/utils'

const LANGS: { code: Lang; label: string; aria: string }[] = [
  { code: 'zh', label: '中', aria: '中文' },
  { code: 'en', label: 'EN', aria: 'English' },
  { code: 'ja', label: '日', aria: '日本語' },
]

export function LangSwitch({ inHeader = true }: { inHeader?: boolean }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div
      className={cn('lang-switch inline-flex gap-px p-0.5 border border-line bg-paper-faint rounded', inHeader && 'in-header ml-auto flex-shrink-0')}
      role="group"
      aria-label={t('common.language')}
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={cn(
            'lang-btn px-2.5 py-1 font-display italic text-[11px] tracking-[0.08em] border-0 bg-transparent cursor-pointer transition-colors',
            lang === l.code ? 'text-accent bg-accent-soft' : 'text-ink-faint hover:text-ink-soft',
          )}
          aria-label={l.aria}
          aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
