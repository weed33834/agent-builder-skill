import { useState, useEffect } from 'react'
import { Header } from './l9_ui/layout/Header'
import { Sidebar } from './l9_ui/layout/Sidebar'
import { ChatWindow } from './l9_ui/chat/ChatWindow'
import { ErrorBoundary } from './l9_ui/shared/ErrorBoundary'
import { AdminConsole } from './l9_ui/admin'
import { WorkspaceConsole } from './l9_ui/workspace/WorkspaceConsole'
import { getAgentConfig, getMCPStatus, discoverMCPTools } from './l8_api/api'
import * as sessionsApi from './l8_api/api'
import type { AgentConfig, MCPConnection, MCPToolDescriptor, Session } from './types'

const sessionGroupsApi = sessionsApi.listSessionGroups

export interface SessionGroup {
  id: string
  name: string
  session_count: number
}

type View = 'chat' | 'admin' | 'workspace'

function toUiSession(s: sessionsApi.SessionMeta): Session {
  return {
    id: s.id,
    title: s.title,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    groupId: s.group_id || '',
    favorite: s.favorite === true,
  }
}

export function App() {
  const [view, setView] = useState<View>('chat')
  const [sessions, setSessions] = useState<Session[]>([])
  const [groups, setGroups] = useState<SessionGroup[]>([])
  const [activeSession, setActiveSession] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [mcpServers, setMcpServers] = useState<MCPConnection[]>([])
  const [mcpTools, setMcpTools] = useState<MCPToolDescriptor[]>([])
  const [showStatusPanel, setShowStatusPanel] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setView('workspace')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const refreshSessions = async () => {
    try {
      const list = await sessionsApi.listSessions()
      setSessions(list.map(toUiSession))
      if (!list.length) {
        // ensure at least one session exists
        const created = await sessionsApi.createSession('New Chat')
        const all = await sessionsApi.listSessions()
        setSessions(all.map(toUiSession))
        setActiveSession(created.id)
      } else if (!activeSession || !list.some(s => s.id === activeSession)) {
        setActiveSession(list[0].id)
      }
    } catch {
      // fall back to a local default if the backend is unavailable
      const localId = crypto.randomUUID()
      setSessions([{ id: localId, title: 'New Chat', createdAt: new Date() }])
      setActiveSession(localId)
    }
  }

  const refreshGroups = async () => {
    try {
      const res = await sessionGroupsApi()
      setGroups(res.items || [])
    } catch {
      setGroups([])
    }
  }

  useEffect(() => {
    getAgentConfig().then(setConfig).catch(() => {})
    getMCPStatus().then(data => {
      setMcpServers(data.servers.map(s => ({
        serverId: s.id,
        serverName: s.name,
        status: s.status,
        tools: s.tools,
        error: s.error,
      })))
    }).catch(() => {})
    discoverMCPTools().then(setMcpTools).catch(() => {})
    refreshSessions()
    refreshGroups()
  }, [])

  const createSession = async (groupId?: string) => {
    try {
      const created = await sessionsApi.createSession('New Chat', groupId || '')
      setSessions(prev => [toUiSession(created), ...prev])
      setActiveSession(created.id)
      refreshGroups()
    } catch {
      const id = crypto.randomUUID()
      setSessions(prev => [...prev, { id, title: `Chat ${prev.length + 1}`, createdAt: new Date(), groupId }])
      setActiveSession(id)
    }
  }

  const deleteSession = async (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (activeSession === id) {
        setActiveSession(remaining[0]?.id || '')
      }
      return remaining
    })
    try { await sessionsApi.deleteSession(id) } catch { /* ignore */ }
    refreshGroups()
  }

  const renameSession = async (id: string, title: string) => {
    try {
      const updated = await sessionsApi.updateSession(id, { title })
      setSessions(prev => prev.map(s => s.id === id ? toUiSession(updated) : s))
    } catch { /* ignore */ }
  }

  const toggleFavorite = async (id: string, favorite: boolean) => {
    try {
      const updated = await sessionsApi.updateSession(id, { favorite })
      setSessions(prev => prev.map(s => s.id === id ? toUiSession(updated) : s))
    } catch { /* ignore */ }
  }

  const moveGroup = async (id: string, groupId: string) => {
    try {
      const updated = await sessionsApi.updateSession(id, { group_id: groupId })
      setSessions(prev => prev.map(s => s.id === id ? toUiSession(updated) : s))
      refreshGroups()
    } catch { /* ignore */ }
  }

  const searchSessions = async (q: string) => {
    try {
      const list = await sessionsApi.listSessions({ q })
      setSessions(list.map(toUiSession))
    } catch { /* ignore */ }
  }

  const shareSession = async (id: string) => {
    try {
      const res = await sessionsApi.createShare(id)
      const url = `${window.location.origin}${res.url}`
      await navigator.clipboard?.writeText(url)
      alert(`分享链接已复制到剪贴板：\n${url}`)
    } catch { /* ignore */ }
  }

  const exportSession = async (id: string) => {
    try {
      const md = await sessionsApi.exportSession(id)
      const blob = new Blob([md], { type: 'text/markdown' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `session-${id.slice(0, 8)}.md`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { /* ignore */ }
  }

  const features = config?.ui?.features || ['session_management', 'tool_visualization']
  const showToolViz = features.includes('tool_visualization')
  const showFileUpload = features.includes('file_upload')
  const showChartDisplay = features.includes('chart_display')
  const showA2APanel = config?.a2a?.enabled ?? true

  const mcpConnected = mcpServers.filter(s => s.status === 'connected').length
  const mcpTotal = mcpServers.length

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sessionTitle={sessions.find(s => s.id === activeSession)?.title || config?.ui?.title || 'Agent'}
        >
          {/* Chat / Admin view toggle */}
          <div className="view-switcher" role="tablist" aria-label="视图切换">
            <button
              className={`view-switcher-btn ${view === 'chat' ? 'active' : ''}`}
              onClick={() => setView('chat')}
            >对话</button>
            <button
              className={`view-switcher-btn ${view === 'workspace' ? 'active' : ''}`}
              onClick={() => setView('workspace')}
            >工作台</button>
            <button
              className={`view-switcher-btn ${view === 'admin' ? 'active' : ''}`}
              onClick={() => setView('admin')}
            >管理台</button>
          </div>
          {/* MCP connection status indicator */}
          <div className="header-status-indicators">
            {/* A2A status */}
            {config?.a2a?.enabled && (
              <button
                className="status-indicator a2a-indicator"
                onClick={() => setShowStatusPanel(!showStatusPanel)}
                title="A2A Agent status"
              >
                <span className="status-dot active" />
                <span>A2A</span>
              </button>
            )}
            {/* MCP connection status */}
            <button
              className={`status-indicator mcp-indicator ${mcpTotal > 0 && mcpConnected === mcpTotal ? 'connected' : 'partial'}`}
              onClick={() => setShowStatusPanel(!showStatusPanel)}
              title={`MCP servers: ${mcpConnected}/${mcpTotal} connected`}
            >
              <span className={`status-dot ${mcpConnected === mcpTotal && mcpTotal > 0 ? 'active' : 'warning'}`} />
              <span>MCP {mcpConnected}/{mcpTotal}</span>
            </button>
          </div>
        </Header>

        {view === 'admin' ? (
          <div className="app-admin-body"><AdminConsole /></div>
        ) : view === 'workspace' ? (
          <div className="app-workspace-body" style={{ height: '100%' }}>
            <WorkspaceConsole onNavigate={(v) => setView(v as View)} />
          </div>
        ) : (
        <div className="app-body">
          <Sidebar
            sessions={sessions}
            groups={groups}
            activeSession={activeSession}
            onSelect={setActiveSession}
            onCreate={createSession}
            onDelete={deleteSession}
            onRename={renameSession}
            onToggleFavorite={toggleFavorite}
            onMoveGroup={moveGroup}
            onShare={shareSession}
            onExport={exportSession}
            onSearch={searchSessions}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="main-content">
            {/* A2A / MCP status panel */}
            {showStatusPanel && (
              <div className="status-panel">
                <div className="status-panel-header">
                  <span>System Status</span>
                  <button className="status-panel-close" onClick={() => setShowStatusPanel(false)}>✕</button>
                </div>
                <div className="status-panel-body">
                  {/* A2A Agent status */}
                  {config?.a2a && (
                    <div className="status-section">
                      <h4 className="status-section-title">A2A Remote Agents</h4>
                      {config.a2a.agents.length > 0 ? (
                        <div className="status-list">
                          {config.a2a.agents.map(agent => (
                            <div key={agent.id} className="status-item">
                              <span className="status-item-name">{agent.name}</span>
                              <span className="status-item-desc">{agent.description}</span>
                              <span className="status-item-badge available">Available</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="status-empty">No remote agents configured</div>
                      )}
                    </div>
                  )}

                  {/* MCP server status */}
                  <div className="status-section">
                    <h4 className="status-section-title">MCP Servers</h4>
                    {mcpServers.length > 0 ? (
                      <div className="status-list">
                        {mcpServers.map(server => (
                          <div key={server.serverId} className="status-item">
                            <span className="status-item-name">{server.serverName}</span>
                            <span className={`status-item-badge ${server.status}`}>
                              {server.status === 'connected' ? 'Connected' : server.status === 'disconnected' ? 'Disconnected' : 'Error'}
                            </span>
                            <span className="status-item-meta">{server.tools} tools</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="status-empty">No MCP servers detected</div>
                    )}
                  </div>

                  {/* MCP available tools */}
                  {mcpTools.length > 0 && (
                    <div className="status-section">
                      <h4 className="status-section-title">MCP Available Tools</h4>
                      <div className="status-list">
                        {mcpTools.map(tool => (
                          <div key={tool.name} className="status-item">
                            <span className="status-item-name">{tool.name}</span>
                            <span className="status-item-desc">{tool.description}</span>
                            <span className="status-item-meta">{tool.serverName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ChatWindow
              key={activeSession}
              sessionId={activeSession}
              showToolViz={showToolViz}
              showFileUpload={showFileUpload}
              showChartDisplay={showChartDisplay}
              showA2APanel={showA2APanel}
            />
          </main>
        </div>
        )}
      </div>
    </ErrorBoundary>
  )
}