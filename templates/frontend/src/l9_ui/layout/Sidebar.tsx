/**
 * L9 - Sidebar Component
 * 
 * Chat list management, supporting creating, switching, and deleting chats.
 * Supports a slide-out sidebar on mobile.
 */

import type { Session } from '../../types'

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
          <h2>Chat List</h2>
          <button className="new-chat-btn" onClick={onCreate} title="New chat">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
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
                  title="Delete chat"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-info">
            {sessions.length} chats
          </div>
        </div>
      </aside>
    </>
  )
}