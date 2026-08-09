/**
 * L9 - 侧边栏组件
 * 
 * 会话列表管理，支持创建、切换、删除会话。
 * 移动端支持滑出式侧边栏。
 */

import type { Session } from '../../App'

interface SidebarProps {
  sessions: Session[]
  activeSession: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({
  sessions,
  activeSession,
  onSelect,
  onCreate,
  onDelete,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>会话列表</h2>
          <button className="new-chat-btn" onClick={onCreate} title="新建会话">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建对话
          </button>
        </div>
        <div className="sidebar-sessions">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${session.id === activeSession ? 'active' : ''}`}
              onClick={() => {
                onSelect(session.id)
                onClose()
              }}
            >
              <div className="session-info">
                <div className="session-title">{session.title}</div>
                <div className="session-date">
                  {session.createdAt.toLocaleDateString('zh-CN')}
                </div>
              </div>
              {sessions.length > 1 && (
                <button
                  className="session-delete"
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  title="删除会话"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-info">
            {sessions.length} 个会话
          </div>
        </div>
      </aside>
    </>
  )
}