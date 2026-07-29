/**
 * 静音按钮 —— 复刻原项目 .mm-mute-btn(transitions.js 注入)。
 * 右上角圆形悬浮,SVG 图标切换静音/非静音。状态走 useMuteStore。
 */
import { useMuteStore } from '@/store'
import { play } from '@/lib/audio'

export function MuteBtn() {
  const muted = useMuteStore((s) => s.muted)
  const toggleMute = useMuteStore((s) => s.toggleMute)

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = toggleMute()
    // 刚取消静音,播放一声 tap 作确认
    if (!next) play('tap')
  }

  return (
    <button
      type="button"
      className="mm-mute-btn fixed z-[10000] w-[42px] h-[42px] rounded-full flex items-center justify-center bg-paper/82 border border-line text-accent shadow-md cursor-pointer backdrop-blur-sm active:scale-95"
      style={{
        top: 'calc(env(safe-area-inset-top,0px) + 12px)',
        right: 'calc(env(safe-area-inset-right,0px) + 12px)',
      }}
      aria-label="切换音效"
      aria-pressed={muted}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
        {muted ? (
          <path d="M16 9l5 5m0-5l-5 5" />
        ) : (
          <>
            <path d="M15 8a5 5 0 0 1 0 8" />
            <path d="M17.5 6a8 8 0 0 1 0 12" />
          </>
        )}
      </svg>
    </button>
  )
}
