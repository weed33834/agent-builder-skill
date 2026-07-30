/**
 * 注册 / 登录页 UI 模板 —— 完整表单 + 「正在开发中」提示。
 *
 * 设计意图:用户后续接入真实后端时,只需替换 handleSubmit 内的占位逻辑
 * (目前弹 toast 提示「正在开发中」),表单字段、校验、UI 都已就位。
 *
 * - Tab 切换:登录 / 注册
 * - 字段:邮箱、密码(注册额外:确认密码、昵称)
 * - 客户端校验:邮箱格式、密码长度、两次密码一致
 * - 第三方登录按钮(GitHub / Google / 微信)同样标记「正在开发中」
 * - 提交后不跳转,toast 提示开发中,保留用户输入
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import {
  InkBlot,
  SealStamp,
  BrushStroke,
  ScrollDivider,
  CalligraphyColumn,
  CornerFlourish,
} from '@/components/ui/Ornaments'

type Mode = 'login' | 'register'

interface FormState {
  email: string
  password: string
  confirm: string
  nickname: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Auth() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'home' })
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState<FormState>({ email: '', password: '', confirm: '', nickname: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const setField = (k: keyof FormState, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.email) e.email = t('auth.err_email_required')
    else if (!EMAIL_RE.test(form.email)) e.email = t('auth.err_email_invalid')
    if (!form.password) e.password = t('auth.err_password_required')
    else if (form.password.length < 8) e.password = t('auth.err_password_short')
    if (mode === 'register') {
      if (!form.confirm) e.confirm = t('auth.err_confirm_required')
      else if (form.confirm !== form.password) e.confirm = t('auth.err_confirm_mismatch')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    // 占位:真实接入时替换为 fetch / signIn 调用
    setTimeout(() => {
      setSubmitting(false)
      toast(t('auth.dev_toast'))
    }, 600)
  }

  const handleSocial = (provider: string) => {
    toast(t('auth.dev_toast_social', { provider }))
  }

  return (
    <div className="container" style={{ position: 'relative' }}>
      {/* 背景装饰 */}
      <InkBlot style={{ position: 'absolute', top: '40px', right: '-60px', width: '320px', height: '320px', pointerEvents: 'none', opacity: 0.3, zIndex: 0 }} />
      <InkBlot color="var(--mirror-value)" style={{ position: 'absolute', bottom: '60px', left: '-80px', width: '260px', height: '260px', pointerEvents: 'none', opacity: 0.2, zIndex: 0 }} />
      <CalligraphyColumn chars={['入', '镜', '留', '影']} style={{ position: 'absolute', top: '24px', left: '-16px', width: '40px', height: '140px', opacity: 0.45, pointerEvents: 'none', zIndex: 0 }} />

      <header className="hero" style={{ position: 'relative', zIndex: 1, paddingBottom: 24 }}>
        <SealStamp char="入" style={{ position: 'absolute', top: '12px', right: '12px', width: '48px', height: '48px', opacity: 0.5, pointerEvents: 'none' }} />
        <div className="mirror-disc" style={{ width: 72, height: 72, marginBottom: 18 }} />
        <p className="hero-eyebrow">MIND MIRROR · {t('auth.eyebrow')}</p>
        <h1 className="art-title" style={{ fontSize: 48 }}>{t('auth.title')}</h1>
        <p className="hero-title-en">{t('auth.subtitle')}</p>
        <p className="hero-lede" style={{ maxWidth: 520, margin: '14px auto 0' }}>{t('auth.lede')}</p>
        <div className="hero-divider"><span /></div>
        <BrushStroke style={{ width: '180px', height: '18px', margin: '0 auto', opacity: 0.5 }} />
      </header>

      {/* 正在开发中提示条 */}
      <motion.div
        className="auth-notice"
        role="status"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <span className="auth-notice-badge">{t('auth.dev_badge')}</span>
        <p className="auth-notice-text">{t('auth.dev_body')}</p>
      </motion.div>

      <div className="auth-card" style={{ position: 'relative', zIndex: 1 }}>
        <CornerFlourish style={{ position: 'absolute', top: '8px', left: '8px', width: '32px', height: '32px', opacity: 0.35, pointerEvents: 'none' }} />
        <CornerFlourish style={{ position: 'absolute', bottom: '8px', right: '8px', width: '32px', height: '32px', opacity: 0.35, pointerEvents: 'none', transform: 'rotate(180deg)' }} />

        {/* Tab 切换 */}
        <div className="auth-tabs" role="tablist">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`auth-tab${mode === m ? ' active' : ''}`}
              onClick={() => { setMode(m); setErrors({}) }}
            >
              {t(`auth.tab_${m}`)}
              {mode === m && (
                <motion.span
                  layoutId="auth-tab-underline"
                  className="auth-tab-underline"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <ScrollDivider style={{ width: '240px', height: '12px', margin: '0 auto 20px', opacity: 0.5 }} />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              {mode === 'register' && (
                <Field
                  label={t('auth.label_nickname')}
                  icon="人"
                  error={errors.nickname}
                >
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={(e) => setField('nickname', e.target.value)}
                    placeholder={t('auth.ph_nickname')}
                    autoComplete="nickname"
                    className="auth-input"
                  />
                </Field>
              )}

              <Field label={t('auth.label_email')} icon="✉" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder={t('auth.ph_email')}
                  autoComplete="email"
                  className={`auth-input${errors.email ? ' has-error' : ''}`}
                  aria-invalid={!!errors.email}
                />
              </Field>

              <Field label={t('auth.label_password')} icon="钥" error={errors.password}>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder={t('auth.ph_password')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`auth-input${errors.password ? ' has-error' : ''}`}
                  aria-invalid={!!errors.password}
                />
              </Field>

              {mode === 'register' && (
                <Field label={t('auth.label_confirm')} icon="钥" error={errors.confirm}>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setField('confirm', e.target.value)}
                    placeholder={t('auth.ph_confirm')}
                    autoComplete="new-password"
                    className={`auth-input${errors.confirm ? ' has-error' : ''}`}
                    aria-invalid={!!errors.confirm}
                  />
                </Field>
              )}
            </motion.div>
          </AnimatePresence>

          {mode === 'login' && (
            <div className="auth-row-between">
              <label className="auth-remember">
                <input type="checkbox" /> <span>{t('auth.remember')}</span>
              </label>
              <button type="button" className="auth-link-btn" onClick={() => toast(t('auth.dev_toast'))}>
                {t('auth.forgot')}
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? t('common.loading') : t(`auth.submit_${mode}`)}
          </Button>
        </form>

        <div className="auth-divider-text"><span>{t('auth.or_divider')}</span></div>

        {/* 第三方登录 */}
        <div className="auth-social">
          {[
            { id: 'github', label: 'GitHub' },
            { id: 'google', label: 'Google' },
            { id: 'wechat', label: t('auth.social_wechat') },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              className="auth-social-btn"
              onClick={() => handleSocial(p.label)}
              aria-label={p.label}
            >
              <SocialIcon id={p.id} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <p className="auth-foot-hint">
          {mode === 'login' ? t('auth.switch_to_register') : t('auth.switch_to_login')}{' '}
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}) }}
          >
            {mode === 'login' ? t('auth.tab_register') : t('auth.tab_login')}
          </button>
        </p>
      </div>

      <div className="actions" style={{ position: 'relative', zIndex: 1, marginTop: 24, textAlign: 'center' }}>
        <Button variant="secondary" to="/">{t('common.back_home')}</Button>
      </div>
    </div>
  )
}

// ---------- 子组件 ----------

function Field({ label, icon, error, children }: {
  label: string
  icon: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        <span className="auth-label-icon" aria-hidden="true">{icon}</span>
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            className="auth-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function SocialIcon({ id }: { id: string }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true } as const
  if (id === 'github') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.4 9.4 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
      </svg>
    )
  }
  if (id === 'google') {
    return (
      <svg {...common} fill="none">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
    )
  }
  // wechat
  return (
    <svg {...common} fill="#4a8b6b">
      <path d="M8.69 2C4.45 2 1 4.94 1 8.56c0 2.1 1.18 3.97 3.02 5.17-.18.7-.5 1.86-.57 2.1-.09.3.13.27.27.18.13-.07 1.6-1.06 2.32-1.55.66.16 1.36.26 2.08.29-.18-.55-.27-1.13-.27-1.73 0-3.34 3.34-6.05 7.46-6.05.27 0 .53.02.79.04C15.5 4.04 12.39 2 8.69 2Zm-2.5 4.2a1.04 1.04 0 1 1 0 2.08 1.04 1.04 0 0 1 0-2.08Zm5 0a1.04 1.04 0 1 1 0 2.08 1.04 1.04 0 0 1 0-2.08Z" />
      <path d="M23 13.78c0-2.96-2.88-5.36-6.43-5.36-3.55 0-6.42 2.4-6.42 5.36 0 2.96 2.87 5.36 6.42 5.36.7 0 1.36-.09 1.99-.26.55.37 1.79 1.18 1.91 1.25.12.07.3.1.21-.16-.06-.18-.32-1.13-.46-1.71C21.86 17.31 23 15.66 23 13.78Zm-9.07-1.36a.88.88 0 1 1 0-1.76.88.88 0 0 1 0 1.76Zm4.29 0a.88.88 0 1 1 0-1.76.88.88 0 0 1 0 1.76Z" />
    </svg>
  )
}
