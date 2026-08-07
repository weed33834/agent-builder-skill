/**
 * 个人资料页 —— 玻璃质感卡片风格
 * 展示用户头像、昵称、邮箱、认证状态、统计概览
 * 路由: /profile
 *
 * 数据源:本地历史(useHistoryStore)。Supabase 未配置时仍可正常展示统计,
 * 已配置时用户信息(昵称/邮箱)来自 Supabase Auth。
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { useHistoryStore } from '@/store'

export default function Profile() {
  const { t } = useI18n()
  const helmet = useDocumentMeta({ page: 'home' })
  const { user, isAuthenticated, loading, signOut } = useAuth()
  const records = useHistoryStore((s) => s.records)

  const totalAssessments = records.length
  const totalQuestions = records.reduce((s, r) => s + (r.question_count || 0), 0)
  const memberDays = user
    ? Math.max(0, Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  if (loading) {
    return (
      <>
        {helmet}
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <p>{t('common.loading')}</p>
        </div>
      </>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        {helmet}
        <div className="profile-guest">
          <div className="profile-guest-card">
            <div className="profile-guest-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="profile-guest-title">尚未登录</h2>
            <p className="profile-guest-desc">登录后可查看个人资料和测评历史</p>
            <Link to="/auth" className="profile-btn-primary">登录 / 注册</Link>
            <Link to="/" className="profile-btn-ghost">回首页</Link>
          </div>
        </div>
      </>
    )
  }

  const avatarLetter = user.email?.charAt(0).toUpperCase() || '?'
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '用户'
  const email = user.email || ''

  return (
    <>
      {helmet}
      <div className="profile-wrap">
        {/* 背景装饰 */}
        <div className="profile-bg-glow" />
        <div className="profile-bg-circles" />

        <div className="profile-container">
          {/* 顶部导航 */}
          <div className="profile-top-nav">
            <Link to="/" className="profile-back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              回首页
            </Link>
          </div>

          {/* 主卡片 */}
          <motion.div
            className="profile-main-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 头像区 */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-ring">
                <div className="profile-avatar">
                  <span className="profile-avatar-letter">{avatarLetter}</span>
                </div>
              </div>
              <h1 className="profile-name">{displayName}</h1>
              <p className="profile-email">{email}</p>
              <span className="profile-badge">已认证</span>
            </div>

            {/* 统计区 */}
            <div className="profile-stats-grid">
              <div className="profile-stat-item">
                <span className="profile-stat-num">{totalAssessments}</span>
                <span className="profile-stat-label">完成测评</span>
              </div>
              <div className="profile-stat-item">
                <span className="profile-stat-num">{totalQuestions}</span>
                <span className="profile-stat-label">答题总数</span>
              </div>
              <div className="profile-stat-item">
                <span className="profile-stat-num">{memberDays}</span>
                <span className="profile-stat-label">加入天数</span>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="profile-actions">
              <Link to="/my-assessments" className="profile-action-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
                我的测评
              </Link>
              <Link to="/settings" className="profile-action-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                设置
              </Link>
            </div>

            {/* 退出 */}
            <div className="profile-logout-section">
              <button type="button" className="profile-logout-btn" onClick={signOut}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                退出登录
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}