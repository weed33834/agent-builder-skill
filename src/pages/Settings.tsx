/**
 * 设置页 —— 简洁表单风格
 * 语言偏好、通知偏好、账号管理
 * 路由: /settings
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useDocumentMeta } from '@/lib/seo'
import { useLangStore, useMuteStore, type Lang } from '@/store'

const LANG_OPTIONS: { value: Lang; label: string; native: string }[] = [
  { value: 'zh', label: 'Chinese', native: '中文' },
  { value: 'en', label: 'English', native: 'English' },
  { value: 'ja', label: 'Japanese', native: '日本語' },
]

export default function Settings() {
  const helmet = useDocumentMeta({ page: 'home' })
  const { user, isAuthenticated } = useAuth()
  const { lang, setLang } = useLangStore()
  const { muted, setMuted } = useMuteStore()

  const [saved, setSaved] = useState(false)

  const handleLangChange = (l: Lang) => {
    setLang(l)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleMuteToggle = () => {
    setMuted(!muted)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      {helmet}
      <div className="settings-wrap">
        <div className="settings-container">
          {/* 顶部 */}
          <div className="settings-top">
            <Link to="/profile" className="settings-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              个人资料
            </Link>
            <h1 className="settings-title">设置</h1>
          </div>

          <div className="settings-sections">
            {/* 语言设置 */}
            <motion.section
              className="settings-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="settings-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <h2 className="settings-section-title">语言 / Language</h2>
              </div>
              <div className="settings-lang-grid">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`settings-lang-btn${lang === opt.value ? ' is-active' : ''}`}
                    onClick={() => handleLangChange(opt.value)}
                  >
                    <span className="settings-lang-native">{opt.native}</span>
                    <span className="settings-lang-en">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* 偏好设置 */}
            <motion.section
              className="settings-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="settings-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                  <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
                <h2 className="settings-section-title">偏好 / Preferences</h2>
              </div>
              <div className="settings-pref-item">
                <div className="settings-pref-info">
                  <span className="settings-pref-name">音效 / Sound Effects</span>
                  <span className="settings-pref-desc">答题和页面的声音反馈</span>
                </div>
                <button
                  type="button"
                  className={`settings-toggle${muted ? ' is-off' : ' is-on'}`}
                  onClick={handleMuteToggle}
                  role="switch"
                  aria-checked={!muted}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            </motion.section>

            {/* 账号信息 */}
            <motion.section
              className="settings-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="settings-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h2 className="settings-section-title">账号 / Account</h2>
              </div>
              <div className="settings-account-info">
                <div className="settings-account-row">
                  <span className="settings-account-label">邮箱</span>
                  <span className="settings-account-value">{user?.email || '未登录'}</span>
                </div>
                <div className="settings-account-row">
                  <span className="settings-account-label">状态</span>
                  <span className={`settings-account-status${isAuthenticated ? ' is-auth' : ''}`}>
                    {isAuthenticated ? '已登录' : '未登录'}
                  </span>
                </div>
              </div>
              {!isAuthenticated && (
                <div className="settings-account-action">
                  <Link to="/auth" className="settings-btn-primary">登录 / 注册</Link>
                </div>
              )}
            </motion.section>

            {/* 保存提示 */}
            {saved && (
              <motion.div
                className="settings-saved-toast"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                设置已保存
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}