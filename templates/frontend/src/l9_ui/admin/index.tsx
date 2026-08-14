/**
 * Admin Console 主入口（M8.16 管理控制台骨架）
 *
 * 布局：左侧导航 + 顶部栏 + 内容区。
 * 覆盖全部管理模块：
 *   P0：提示词 / 模型 / 工具 / Agent
 *   P1：记忆 / 编排 / 系统设置
 *   P2：评估 / 监控
 * 仪表盘：资产统计卡片 + 系统健康 + 最近动态。
 */

import { useState } from 'react'
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

/* ---------- 仪表盘（概览） ---------- */
const STATS = [
  { label: '启用提示词', value: '8 / 12', icon: '📝', delta: '+2 本周', tone: 'up' },
  { label: '可用模型', value: '6', icon: '🧠', delta: '3 provider', tone: 'flat' },
  { label: '启用的工具', value: '18', icon: '🔧', delta: '+3 本周', tone: 'up' },
  { label: '在线 Agent', value: '4 / 5', icon: '🤖', delta: '1 异常', tone: 'down' },
  { label: '评估通过率', value: '94.2%', icon: '🎯', delta: '+1.8% vs 上周', tone: 'up' },
  { label: '错误率', value: '0.42%', icon: '📈', delta: '-0.13% vs 上周', tone: 'up' },
  { label: '今日 Tokens', value: '4.8M', icon: '⛽', delta: '≈ ¥36.4', tone: 'flat' },
  { label: '告警', value: '2', icon: '🚨', delta: '1 待处理', tone: 'down' },
]

const ACTIVITIES = [
  { time: '21:12', icon: '📝', text: '提示词 <b>客服引导 v4</b> 已发布并接入线上流量 30%' },
  { time: '20:47', icon: '🤖', text: 'Agent <b>周报助手</b> 通过评估（pass_rate 96.1%）' },
  { time: '20:21', icon: '🔧', text: '工具 <b>sales_query</b> 被调用 1,204 次，失败率 0.8%' },
  { time: '19:58', icon: '🚨', text: '告警触发：<b>gpt-4o 延迟 P95 &gt; 3.5s</b> 持续 5 分钟' },
  { time: '19:30', icon: '🧩', text: '知识库 <b>产品文档库</b> 完成增量索引（+126 chunks）' },
  { time: '18:44', icon: '⚙️', text: '管理员修改了 <b>环境变量 LLM_MAX_TOKENS</b>（热加载生效）' },
  { time: '17:52', icon: '🎯', text: '评估任务 <b>ev_20260810_01</b> 完成：12 条用例通过 11 条' },
]

const HEALTH = [
  { name: 'API Gateway', status: 'green', detail: '99.98% 可用' },
  { name: 'LLM 模型服务', status: 'amber', detail: 'gpt-4o P95 偏高' },
  { name: '向量数据库', status: 'green', detail: '3/3 分片正常' },
  { name: 'MCP Servers', status: 'green', detail: '4/4 已连接' },
  { name: '任务队列', status: 'green', detail: '0 积压' },
  { name: '评估 Runner', status: 'green', detail: '空闲' },
]

function DashboardOverview({ onNavigate }: { onNavigate: (s: AdminSection) => void }) {
  return (
    <div className="admin-grid" style={{ gap: 16 }}>
      {/* 统计卡片 */}
      <div className="admin-grid cols-4">
        {STATS.map(s => (
          <div className="admin-stat-card" key={s.label}>
            <div className="admin-stat-label">
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            <div className="admin-stat-value">{s.value}</div>
            <div className={`admin-stat-delta ${s.tone}`}>
              {s.tone === 'up' ? '▲' : s.tone === 'down' ? '▼' : '•'} {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-split left-2">
        {/* 最近动态 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">最近动态</span>
            <span className="admin-card-sub">跨模块操作流水</span>
            <div className="admin-card-header-actions">
              <button className="admin-btn ghost sm">查看全部</button>
            </div>
          </div>
          <div className="admin-card-body tight" style={{ padding: '4px 12px' }}>
            {ACTIVITIES.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < ACTIVITIES.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                <span style={{ fontSize: 14 }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: a.text }} />
                <span style={{ color: 'var(--admin-text-3)', fontSize: 11, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-grid" style={{ gap: 14 }}>
          {/* 系统健康 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">系统健康</span>
              <span className="admin-card-sub">实时</span>
            </div>
            <div className="admin-card-body tight" style={{ padding: '6px 12px' }}>
              {HEALTH.map(h => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <span className={`admin-lamp ${h.status}`} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{h.name}</span>
                  <span style={{ color: 'var(--admin-text-3)', fontSize: 11.5 }}>{h.detail}</span>
                </div>
              ))}
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
  const [badges] = useState<SidebarBadges>({
    prompts: 12,
    models: 8,
    tools: 23,
    agents: 5,
    memory: 4,
    workflows: 3,
    evaluations: 6,
    alerts: 2,
  })
  const [keyword, setKeyword] = useState('')

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
            <button className="admin-btn ghost" title="刷新数据">
              ⟳
            </button>
            <button className="admin-btn ghost" title="通知">
              🔔<span className="admin-nav-badge warning" style={{ transform: 'translate(-16px, -10px)', position: 'absolute' }}>2</span>
            </button>
          </div>
        </div>

        <div className="admin-content">
          {active === 'dashboard' && <DashboardOverview onNavigate={setActive} />}
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
