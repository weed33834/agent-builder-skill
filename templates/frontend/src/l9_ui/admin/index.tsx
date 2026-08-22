/**
 * Admin Console 主入口（M8.16 管理控制台）
 *
 * 布局：左侧导航 + 顶部栏 + 内容区。
 * 仪表盘数据全部来自真实后端端点；拿不到的数据显示"—"空态，
 * 不再使用任何硬编码的假统计/假动态/假健康灯。
 */

import { useEffect, useState } from 'react'
import { AdminSidebar, type AdminSection, type SidebarBadges } from './AdminSidebar'
import { PromptEditor } from './PromptEditor'
import { ModelConfig } from './ModelConfig'
import { ToolRegistry } from './ToolRegistry'
import { SandboxPanel } from './SandboxPanel'
import { AgentGraph } from './AgentGraph'
import { MemoryManager } from './MemoryManager'
import { OrchestrationWorkflow } from './OrchestrationWorkflow'
import { EvaluationDashboard } from './EvaluationDashboard'
import { MonitoringPanel } from './MonitoringPanel'
import { SettingsPanel } from './SettingsPanel'
import { SecurityPanel } from './SecurityPanel'
import { SchedulePanel } from './SchedulePanel'
import {
  adminListPrompts, adminListModels, adminListTools, adminListAgents,
  adminListEvaluations, adminListAlerts, adminGetMetrics,
  adminGetAuditLog, adminListWorkflows,
} from '../../l8_api/api'
import './Styles.css'

const SECTION_META: Record<AdminSection, { title: string; crumb: string }> = {
  dashboard: { title: '仪表盘', crumb: '概览 / 仪表盘' },
  prompts: { title: '提示词管理', crumb: '资产 / 提示词' },
  models: { title: '模型管理', crumb: '资产 / 模型' },
  tools: { title: '工具管理', crumb: '资产 / 工具' },
  sandbox: { title: '沙箱管理', crumb: '资产 / 沙箱' },
  agents: { title: 'Agent 管理', crumb: '资产 / Agent' },
  memory: { title: '记忆管理', crumb: '资产 / 记忆' },
  workflows: { title: '编排管理', crumb: '协同 / 编排' },
  evaluations: { title: '评估管理', crumb: '协同 / 评估' },
  monitoring: { title: '监控告警', crumb: '协同 / 监控' },
  security: { title: '权限安全', crumb: '系统 / 权限安全' },
  schedule: { title: '定时任务', crumb: '系统 / 定时任务' },
  settings: { title: '系统设置', crumb: '系统 / 设置' },
}

interface AuditEntry { ts: number; action: string; subject: string; detail?: string }

/* ---------- 仪表盘（概览）——全部真实数据 ---------- */
function DashboardOverview({ onNavigate, reloadKey }: { onNavigate: (s: AdminSection) => void; reloadKey: number }) {
  const [stats, setStats] = useState<Record<string, string>>({})
  const [activities, setActivities] = useState<AuditEntry[]>([])
  const [health, setHealth] = useState<{ name: string; status: string; detail: string }[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [prompts, models, tools, agents, evals, alertsRes, metricsRes] = await Promise.allSettled([
        adminListPrompts(), adminListModels(), adminListTools(),
        adminListAgents(), adminListEvaluations(), adminListAlerts(),
        adminGetMetrics(),
      ])
      if (cancelled) return
      const val = (x: PromiseSettledResult<unknown>) => (x.status === 'fulfilled' ? x.value : null)
      const summary = (val(metricsRes) as { summary?: Record<string, number> } | null)?.summary
      setStats({
        prompts: String(val(prompts) ? (val(prompts) as { total: number }).total : '—'),
        models: String(val(models) ? (val(models) as { total: number }).total : '—'),
        tools: String(val(tools) ? (val(tools) as { total: number }).total : '—'),
        agents: String(val(agents) ? (val(agents) as { total: number }).total : '—'),
        evaluations: String(val(evals) ? (val(evals) as { total: number }).total : '—'),
        alerts: String(val(alertsRes) ? (val(alertsRes) as { total: number }).total : '—'),
        requests: summary ? String(summary.requests ?? '—') : '—',
        tokens: summary ? String(summary.tokens ?? '—') : '—',
      })
    })()

    adminGetAuditLog()
      .then(r => { if (!cancelled) setActivities((r.items as unknown as AuditEntry[]).slice(0, 6)) })
      .catch(() => { if (!cancelled) setActivities([]) })

    fetch('/api/health')
      .then(r => r.json())
      .then(h => {
        if (cancelled) return
        setHealth([
          { name: 'API 服务', status: h.status === 'ok' ? 'green' : 'amber', detail: `v${h.version}` },
          { name: 'LLM 连接', status: h.llm_connected ? 'green' : 'amber', detail: h.llm_connected ? '已配置' : '未配置 API Key' },
        ])
      })
      .catch(() => { if (!cancelled) setHealth([{ name: 'API 服务', status: 'amber', detail: '无法连接' }]) })

    return () => { cancelled = true }
  }, [reloadKey])

  const statCards = [
    { label: '提示词', value: stats.prompts ?? '—', icon: '📝' },
    { label: '模型', value: stats.models ?? '—', icon: '🧠' },
    { label: '工具', value: stats.tools ?? '—', icon: '🔧' },
    { label: 'Agent', value: stats.agents ?? '—', icon: '🤖' },
    { label: '评估任务', value: stats.evaluations ?? '—', icon: '🎯' },
    { label: '告警规则', value: stats.alerts ?? '—', icon: '🚨' },
    { label: '累计请求', value: stats.requests ?? '—', icon: '📈' },
    { label: '累计 Tokens', value: stats.tokens ?? '—', icon: '⛽' },
  ]

  return (
    <div className="admin-grid" style={{ gap: 16 }}>
      {/* 统计卡片 */}
      <div className="admin-grid cols-4">
        {statCards.map(s => (
          <div className="admin-stat-card" key={s.label}>
            <div className="admin-stat-label">
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            <div className="admin-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-split left-2">
        {/* 最近动态——真实审计日志 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">最近动态</span>
            <span className="admin-card-sub">审计日志</span>
          </div>
          <div className="admin-card-body tight" style={{ padding: '4px 12px' }}>
            {activities.length === 0 && (
              <div style={{ padding: '10px 0', color: 'var(--admin-text-3)', fontSize: 12.5 }}>
                暂无操作记录
              </div>
            )}
            {activities.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < activities.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }}>
                  {a.action} · {a.subject}{a.detail ? ` — ${a.detail}` : ''}
                </span>
                <span style={{ color: 'var(--admin-text-3)', fontSize: 11, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(a.ts * 1000).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-grid" style={{ gap: 14 }}>
          {/* 系统健康——真实探活 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">系统健康</span>
              <span className="admin-card-sub">实时</span>
            </div>
            <div className="admin-card-body tight" style={{ padding: '6px 12px' }}>
              {health.map(h => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <span className={`admin-lamp ${h.status}`} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{h.name}</span>
                  <span style={{ color: 'var(--admin-text-3)', fontSize: 11.5 }}>{h.detail}</span>
                </div>
              ))}
              {health.length === 0 && (
                <div style={{ padding: '8px 0', color: 'var(--admin-text-3)', fontSize: 12.5 }}>加载中…</div>
              )}
            </div>
          </div>

          {/* 快捷入口 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">快捷操作</span>
            </div>
            <div className="admin-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12 }}>
              <button className="admin-btn primary sm" onClick={() => onNavigate('prompts')}>+ 新建提示词</button>
              <button className="admin-btn sm" onClick={() => onNavigate('tools')}>🔌 连接 MCP</button>
              <button className="admin-btn sm" onClick={() => onNavigate('evaluations')}>🎯 运行评估</button>
              <button className="admin-btn sm" onClick={() => onNavigate('models')}>🧪 测试模型</button>
              <button className="admin-btn sm" onClick={() => onNavigate('memory')}>🧩 检索测试</button>
              <button className="admin-btn sm" onClick={() => onNavigate('agents')}>🤖 新建 Agent</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- 主入口 ---------- */
export function AdminConsole() {
  const [active, setActive] = useState<AdminSection>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [badges, setBadges] = useState<SidebarBadges>({
    prompts: 0, models: 0, tools: 0, agents: 0,
    memory: 0, workflows: 0, evaluations: 0, alerts: 0,
  })
  const [keyword, setKeyword] = useState('')

  // Sidebar badges computed from real list endpoints.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const results = await Promise.allSettled([
        adminListPrompts(), adminListModels(), adminListTools(),
        adminListAgents(), adminListWorkflows(), adminListEvaluations(),
        adminListAlerts(),
      ])
      if (cancelled) return
      const t = (i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<{ total: number }>).value.total : 0)
      setBadges(b => ({
        ...b,
        prompts: t(0), models: t(1), tools: t(2), agents: t(3),
        workflows: t(4), evaluations: t(5), alerts: t(6),
      }))
    })()
    return () => { cancelled = true }
  }, [reloadKey])

  const meta = SECTION_META[active]

  return (
    <div className="admin-console">
      <AdminSidebar
        active={active}
        onSelect={setActive}
        badges={badges}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      <div className="admin-main">
        <div className="admin-topbar">
          <span className="admin-topbar-title">{meta.title}</span>
          <span className="admin-topbar-breadcrumb">{meta.crumb}</span>
          <div className="admin-topbar-actions">
            <div className="admin-search">
              <span className="admin-search-icon">🔍</span>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="搜索资产（提示词/工具/模型…）"
              />
            </div>
            <button className="admin-btn ghost" title="刷新数据" onClick={() => setReloadKey(k => k + 1)}>
              ⟳
            </button>
            <button className="admin-btn ghost" title="通知">
              🔔
            </button>
          </div>
        </div>

        <div className="admin-content">
          {active === 'dashboard' && <DashboardOverview onNavigate={setActive} reloadKey={reloadKey} />}
          {active === 'prompts' && <PromptEditor />}
          {active === 'models' && <ModelConfig />}
          {active === 'tools' && <ToolRegistry />}
          {active === 'sandbox' && <SandboxPanel />}
          {active === 'agents' && <AgentGraph />}
          {active === 'memory' && <MemoryManager />}
          {active === 'workflows' && <OrchestrationWorkflow />}
          {active === 'evaluations' && <EvaluationDashboard />}
          {active === 'monitoring' && <MonitoringPanel />}
          {active === 'security' && <SecurityPanel />}
          {active === 'schedule' && <SchedulePanel />}
          {active === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  )
}

export default AdminConsole
