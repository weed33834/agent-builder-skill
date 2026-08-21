/**
 * Admin Sidebar（管理控制台左侧导航）
 *
 * 分组导航（概览 / 资产 / 协同 / 系统），每项含图标 + 名称 + 徽章（告警数、资产数）。
 * 支持折叠模式；徽章类型区分错误(红)/警告(黄)/正常(绿)。
 */

export type AdminSection =
  | 'dashboard'
  | 'prompts'
  | 'models'
  | 'tools'
  | 'sandbox'
  | 'agents'
  | 'memory'
  | 'workflows'
  | 'evaluations'
  | 'monitoring'
  | 'security'
  | 'schedule'
  | 'settings'

export interface SidebarBadges {
  prompts?: number
  models?: number
  tools?: number
  agents?: number
  alerts?: number
  memory?: number
  workflows?: number
  evaluations?: number
}

interface NavItem {
  id: AdminSection
  label: string
  icon: string
  badgeKey?: keyof SidebarBadges
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '概览',
    items: [{ id: 'dashboard', label: '仪表盘', icon: '📊' }],
  },
  {
    title: '资产',
    items: [
      { id: 'prompts', label: '提示词', icon: '📝', badgeKey: 'prompts' },
      { id: 'models', label: '模型', icon: '🧠', badgeKey: 'models' },
      { id: 'tools', label: '工具', icon: '🔧', badgeKey: 'tools' },
      { id: 'sandbox', label: '沙箱', icon: '🛡️' },
      { id: 'agents', label: 'Agent', icon: '🤖', badgeKey: 'agents' },
      { id: 'memory', label: '记忆', icon: '🧩', badgeKey: 'memory' },
    ],
  },
  {
    title: '协同',
    items: [
      { id: 'workflows', label: '编排', icon: '🕸️', badgeKey: 'workflows' },
      { id: 'evaluations', label: '评估', icon: '🎯', badgeKey: 'evaluations' },
      { id: 'monitoring', label: '监控', icon: '📈', badgeKey: 'alerts' },
    ],
  },
  {
    title: '系统',
    items: [
      { id: 'security', label: '权限安全', icon: '🔐' },
      { id: 'schedule', label: '定时任务', icon: '⏰' },
      { id: 'settings', label: '系统设置', icon: '⚙️' },
    ],
  },
]

/** 徽章样式：告警/异常用红色，待处理用黄色，正常用绿色 */
function badgeTone(key: keyof SidebarBadges): string {
  if (key === 'alerts') return 'warning'
  if (key === 'tools' || key === 'prompts') return ''
  return 'success'
}

interface AdminSidebarProps {
  active: AdminSection
  onSelect: (section: AdminSection) => void
  badges?: SidebarBadges
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function AdminSidebar({
  active,
  onSelect,
  badges,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-logo">⚡</div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div className="admin-sidebar-title">管理控制台</div>
            <div className="admin-sidebar-sub">Admin Console</div>
          </div>
        )}
        <button
          className="admin-sidebar-collapse"
          onClick={onToggleCollapse}
          title={collapsed ? '展开导航' : '折叠导航'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="admin-sidebar-nav">
        {NAV_GROUPS.map(group => (
          <div className="admin-nav-group" key={group.title}>
            <div className="admin-nav-group-title">{collapsed ? '·' : group.title}</div>
            {group.items.map(item => {
              const count = item.badgeKey ? badges?.[item.badgeKey] : undefined
              return (
                <button
                  key={item.id}
                  className={`admin-nav-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => onSelect(item.id)}
                  title={item.label}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span className="admin-nav-label">{item.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className={`admin-nav-badge ${badgeTone(item.badgeKey!)}`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-user-avatar">A</div>
        {!collapsed && (
          <div className="admin-user-info">
            <div className="admin-user-name">Admin</div>
            <div className="admin-user-role">管理员 · 系统运维</div>
          </div>
        )}
      </div>
    </aside>
  )
}
