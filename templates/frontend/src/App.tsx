import { useState, useEffect } from 'react'
import { Header } from './l9_ui/layout/Header'
import { Sidebar } from './l9_ui/layout/Sidebar'
import { ChatWindow } from './l9_ui/chat/ChatWindow'
import { ErrorBoundary } from './l9_ui/shared/ErrorBoundary'
import { getAgentConfig, getMCPStatus, discoverMCPTools } from './l8_api/api'
import type { AgentConfig, MCPConnection, MCPToolDescriptor } from './types'

export interface Session {
  id: string
  title: string
  createdAt: Date
}

export function App() {
  const [sessions, setSessions] = useState<Session[]>([
    { id: 'default', title: 'New Chat', createdAt: new Date() },
  ])
  const [activeSession, setActiveSession] = useState('default')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [mcpServers, setMcpServers] = useState<MCPConnection[]>([])
  const [mcpTools, setMcpTools] = useState<MCPToolDescriptor[]>([])
  const [showStatusPanel, setShowStatusPanel] = useState(false)

  useEffect(() => {
    getAgentConfig().then(setConfig).catch(() => {})
    // Fetch MCP status
    getMCPStatus().then(data => {
      setMcpServers(data.servers.map(s => ({
        serverId: s.id,
        serverName: s.name,
        status: s.status,
        tools: s.tools,
        error: s.error,
      })))
    }).catch(() => {})
    // Discover MCP tools
    discoverMCPTools().then(setMcpTools).catch(() => {})
  }, [])

  const createSession = () => {
    const id = crypto.randomUUID()
    setSessions(prev => [
      ...prev,
      {
        id,
        title: `Chat ${prev.length + 1}`,
        createdAt: new Date(),
      },
    ])
    setActiveSession(id)
  }

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (activeSession === id) {
        setActiveSession(remaining[0]?.id || 'default')
      }
      return remaining
    })
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

        <div className="app-body">
          <Sidebar
            sessions={sessions}
            activeSession={activeSession}
            onSelect={setActiveSession}
            onCreate={createSession}
            onDelete={deleteSession}
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
      </div>
    </ErrorBoundary>
  )
}