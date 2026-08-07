/**
 * 我的测评页 —— 时间线/列表风格
 * 展示用户完成的所有测评历史记录
 * 路由: /my-assessments
 *
 * 数据源:本地历史(useHistoryStore,持久化于 localStorage)。
 * 不依赖 Supabase,未登录亦可查看本机记录。
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useDocumentMeta } from '@/lib/seo'
import { useHistoryStore, type HistoryRecord } from '@/store'

const ASSESSMENT_NAMES: Record<string, { title: string; icon: string; route: string }> = {
  celebrity: { title: '名人镜', icon: '名', route: '/report/celebrity' },
  value: { title: '价值镜', icon: '价', route: '/report/value' },
  ideology: { title: '意识镜', icon: '意', route: '/report/ideology' },
  galgame: { title: 'Galgame 资历测评', icon: 'G', route: '/report-galgame' },
  'galgame-char': { title: 'Galgame 角色画像', icon: '角', route: '/report-galgame-char' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${m}月${day}日 ${h}:${min}`
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前`
  return `${Math.floor(diff / 31536000)} 年前`
}

export default function MyAssessments() {
  const helmet = useDocumentMeta({ page: 'home' })
  const records = useHistoryStore((s) => s.records)
  const clearHistory = useHistoryStore((s) => s.clearHistory)

  return (
    <>
      {helmet}
      <div className="assessments-wrap">
        <div className="assessments-container">
          {/* 顶部 */}
          <div className="assessments-top">
            <Link to="/profile" className="assessments-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              个人资料
            </Link>
            <h1 className="assessments-title">我的测评</h1>
            <p className="assessments-subtitle">共 {records.length} 次探索记录(本机)</p>
            {records.length > 0 && (
              <button
                type="button"
                className="assessments-btn-ghost"
                onClick={() => { if (confirm('确定清空所有本机测评记录?此操作不可恢复。')) clearHistory() }}
                style={{ marginTop: 12, fontSize: 12 }}
              >
                清空记录
              </button>
            )}
          </div>

          {/* 时间线 */}
          {records.length === 0 ? (
            <div className="assessments-empty">
              <div className="assessments-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className="assessments-empty-title">还没有测评记录</h3>
              <p className="assessments-empty-desc">去选择一个测评，开始你的第一次探索吧</p>
              <Link to="/sections" className="assessments-btn-primary">探索测评</Link>
            </div>
          ) : (
            <div className="assessments-timeline">
              <div className="assessments-timeline-line" />
              {records.map((record: HistoryRecord, i) => {
                const meta = ASSESSMENT_NAMES[record.assessment_id] || { title: record.assessment_id, icon: '?', route: '#' }
                const reportLink = record.share ? `${meta.route}?r=${encodeURIComponent(record.share)}` : meta.route
                return (
                  <motion.div
                    key={record.id}
                    className="assessments-timeline-item"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="assessments-timeline-dot" />
                    <div className="assessments-timeline-card">
                      <div className="assessments-timeline-head">
                        <span className="assessments-timeline-icon">{meta.icon}</span>
                        <div className="assessments-timeline-info">
                          <span className="assessments-timeline-name">{meta.title}</span>
                          <span className="assessments-timeline-time" title={formatDate(record.created_at)}>
                            {timeAgo(record.created_at)}
                          </span>
                        </div>
                        {record.duration_sec != null && record.duration_sec > 0 && (
                          <span className="assessments-timeline-duration">
                            {Math.floor(record.duration_sec / 60)}分{record.duration_sec % 60}秒
                          </span>
                        )}
                      </div>
                      {record.summary && (
                        <p className="assessments-timeline-summary">{record.summary}</p>
                      )}
                      <div className="assessments-timeline-foot">
                        <Link to={reportLink} className="assessments-timeline-link">
                          查看报告
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" /><polyline points="12 5 19 12 12 19" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}