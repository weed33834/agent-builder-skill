/**
 * 认证页 —— 双栏布局（左品牌 / 右表单），接入 Supabase 真实认证。
 *
 * - 登录 / 注册 Tab 切换
 * - 邮箱密码登录 / 注册
 * - GitHub / Google OAuth 登录
 * - 表单校验、加载态、错误提示
 * - 登录成功后跳转首页
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { useAuth } from '@/lib/auth'
import { toast } from '@/lib/utils'

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
  const helmet = useDocumentMeta({ page: 'home' })
  const navigate = useNavigate()
  const { signIn, signUp, signInWithProvider } = useAuth()

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

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) {
          toast(error.message, 'error')
          return
        }
        toast(t('auth.login_success'))
        navigate('/')
      } else {
        const { error } = await signUp(form.email, form.password, form.nickname || undefined)
        if (error) {
          toast(error.message, 'error')
          return
        }
        toast(t('auth.register_success'))
        navigate('/')
      }
    } catch {
      toast(t('common.error_generic'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSocial = async (provider: 'github' | 'google') => {
    setSubmitting(true)
    try {
      const { error } = await signInWithProvider(provider)
      if (error) {
        toast(error.message, 'error')
      }
      // OAuth 重定向由 Supabase 处理，不需要 navigate
    } catch {
      toast(t('common.error_generic'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async () => {
    if (!form.email) {
      toast(t('auth.err_email_required'), 'warn')
      return
    }
    if (!EMAIL_RE.test(form.email)) {
      toast(t('auth.err_email_invalid'), 'warn')
      return
    }
    const { supabase } = await import('@/lib/supabase')
    if (!supabase) {
      toast(t('auth.err_supabase_not_configured') || '认证服务未配置', 'error')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) {
      toast(error.message, 'error')
    } else {
      toast(t('auth.forgot_sent'))
    }
  }

  return (
    <>
      {helmet}
      <div className="auth-split">
        {/* 左栏：品牌展示 */}
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <div className="auth-brand-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.8" />
              </svg>
            </div>
            <h1 className="auth-brand-title">心镜</h1>
            <p className="auth-brand-sub">MindMirror</p>
            <p className="auth-brand-tagline">{t('auth.lede')}</p>
            <div className="auth-brand-divider" />
            <p className="auth-brand-quote">{t('auth.brand_quote')}</p>
          </div>
        </div>

        {/* 右栏：表单 */}
        <div className="auth-panel">
          <div className="auth-panel-inner">
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

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="auth-fields-wrap"
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
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={handleForgot}
                  >
                    {t('auth.forgot')}
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="auth-submit-loading">
                    <span className="auth-spinner" />
                    {t('common.loading')}
                  </span>
                ) : (
                  t(`auth.submit_${mode}`)
                )}
              </button>
            </form>

            <div className="auth-divider-text"><span>{t('auth.or_divider')}</span></div>

            <div className="auth-social">
              <button
                type="button"
                className="auth-social-btn"
                onClick={() => handleSocial('github')}
                disabled={submitting}
                aria-label="GitHub"
              >
                <SocialIcon id="github" />
                <span>GitHub</span>
              </button>
              <button
                type="button"
                className="auth-social-btn"
                onClick={() => handleSocial('google')}
                disabled={submitting}
                aria-label="Google"
              >
                <SocialIcon id="google" />
                <span>Google</span>
              </button>
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
        </div>
      </div>
    </>
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
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true as const }
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
  return null
}