import { useState, useEffect } from 'react'
import { Header } from './l9_ui/layout/Header'
import { Sidebar } from './l9_ui/layout/Sidebar'
import { ChatWindow } from './l9_ui/chat/ChatWindow'
import { ErrorBoundary } from './l9_ui/shared/ErrorBoundary'
import { getAgentConfig } from './l8_api/api'
import type { AgentConfig } from './types'

export interface Session {
  id: string
  title: string
  createdAt: Date
}

export function App() {
  const [sessions, setSessions] = useState<Session[]>([
    { id: 'default', title: '新会话', createdAt: new Date() },
  ])
  const [activeSession, setActiveSession] = useState('default')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [config, setConfig] = useState<AgentConfig | null>(null)

  useEffect(() => {
    getAgentConfig().then(setConfig).catch(() => {})
  }, [])

  const createSession = () => {
    const id = crypto.randomUUID()
    setSessions(prev => [
      ...prev,
      {
        id,
        title: `会话 ${prev.length + 1}`,
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

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sessionTitle={sessions.find(s => s.id === activeSession)?.title || config?.ui?.title || 'Agent'}
        />
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
            <ChatWindow
              key={activeSession}
              sessionId={activeSession}
              showToolViz={showToolViz}
              showFileUpload={showFileUpload}
              showChartDisplay={showChartDisplay}
            />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
