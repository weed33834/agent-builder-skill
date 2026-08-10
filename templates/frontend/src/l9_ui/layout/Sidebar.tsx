/**
 * L9 - Sidebar Component
 *
 * Chat list management, supporting creating, switching, and deleting chats.
 * Extended for the workspace feature set (full-spec G1-G5):
 *   - search (G2), grouping/projects (G1), favorites (G3),
 *     share + export (G4).
 */

import { useState } from 'react'
import type { Session } from '../../types'

interface SessionGroup {
  id: string
  name: string
  session_count: number
}

interface SidebarProps {
  sessions: Session[]
  groups: SessionGroup[]
  activeSession: string
  onSelect: (id: string) => void
  onCreate: (groupId?: string) => void
  onDelete: (id: string) => void
  onRename?: (id: string, title: string) => void
  onToggleFavorite?: (id: string, favorite: boolean) => void
  onMoveGroup?: (id: string, groupId: string) => void
  onShare?: (id: string) => void
  onExport?: (id: string) => void
  onSearch?: (q: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({
  sessions,
  groups,
  activeSession,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onToggleFavorite,
  onMoveGroup,
  onShare,
  onExport,
  onSearch,
  isOpen,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)

  const showSearch = typeof onSearch === 'function'

  const handleSearch = (value: string) => {
    setQuery(value)
    if (onSearch) onSearch(value)
  }

  const renderSessionItem = (session: Session) => {
    const active = session.id === activeSession
    return (
      <div
        key={session.id}
        className={`session-item ${active ? 'active' : ''}`}
        onClick={() => {
          onSelect(session.id)
          onClose()
        }}
      >
        <div className="session-info">
          {renamingId === session.id ? (
            <input
              className="session-rename-input"
              autoFocus
              value={renameText}
              onClick={e => e.stopPropagation()}
              onChange={e => setRenameText(e.target.value)}
              onBlur={() => {
                if (onRename && renameText.trim()) onRename(session.id, renameText.trim())
                setRenamingId(null)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (onRename && renameText.trim()) onRename(session.id, renameText.trim())
                  setRenamingId(null)
                }
              }}
            />
          ) : (
            <div className="session-title" title={session.title}>{session.title}</div>
          )}
          <div className="session-date">
            {(session.updatedAt || session.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>

        {session.favorite && <span className="session-fav-star">★</span>}

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

        {/* Action menu: rename / favorite / move / share / export */}
        <button
          className="session-menu-btn"
          onClick={e => {
            e.stopPropagation()
            setMenuId(menuId === session.id ? null : session.id)
          }}
          title="More actions"
        >
          ⋯
        </button>
        {menuId === session.id && (
          <div className="session-menu" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => {
                setRenamingId(session.id)
                setRenameText(session.title)
                setMenuId(null)
              }}
            >
              ✏️ 重命名
            </button>
            {onToggleFavorite && (
              <button
                onClick={() => {
                  onToggleFavorite(session.id, !session.favorite)
                  setMenuId(null)
                }}
              >
                {session.favorite ? '☆ 取消收藏' : '★ 收藏'}
              </button>
            )}
            {onMoveGroup && (
              <label className="session-menu-group">
                📁 移动到
                <select
                  value={session.groupId || ''}
                  onChange={e => {
                    onMoveGroup(session.id, e.target.value)
                    setMenuId(null)
                  }}
                >
                  <option value="">默认</option>
                  {groups.filter(g => g.id).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            )}
            {onShare && (
              <button onClick={() => { onShare(session.id); setMenuId(null) }}>
                🔗 生成分享链接
              </button>
            )}
            {onExport && (
              <button onClick={() => { onExport(session.id); setMenuId(null) }}>
                ⬇️ 导出 MD
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>会话</h2>
          <button className="new-chat-btn" onClick={() => onCreate()} title="New chat">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>

        {showSearch && (
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="搜索会话标题/内容…"
              value={query}
              onChange={e => handleSearch(e.target.value)}
            />
            {query && (
              <button className="sidebar-search-clear" onClick={() => handleSearch('')}>✕</button>
            )}
          </div>
        )}

        <div className="sidebar-sessions">
          {/* Group folders */}
          {groups.map(group => {
            const groupSessions = sessions.filter(s => (s.groupId || '') === group.id)
            if (groupSessions.length === 0) return null
            return (
              <div className="session-group" key={group.id}>
                <div className="session-group-header">
                  <span className="session-group-name">
                    {group.id ? '📁 ' : '🗂 '}{group.name}
                  </span>
                  <span className="session-group-count">{groupSessions.length}</span>
                  {onCreate && (
                    <button
                      className="session-group-add"
                      title={`新建到「${group.name}」`}
                      onClick={() => onCreate(group.id)}
                    >
                      +
                    </button>
                  )}
                </div>
                {groupSessions.map(renderSessionItem)}
              </div>
            )
          })}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-info">{sessions.length} 个会话</div>
        </div>
      </aside>
    </>
  )
}
