import { useState } from 'react'
import { Header } from './l9_ui/layout/Header'
import { Sidebar } from './l9_ui/layout/Sidebar'
import { ChatWindow } from './l9_ui/chat/ChatWindow'
import { ErrorBoundary } from './l9_ui/shared/ErrorBoundary'

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
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSession === id) {
      setActiveSession(sessions[0]?.id || 'default')
    }
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sessionTitle={sessions.find(s => s.id === activeSession)?.title || 'Agent Builder'}
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
            <ChatWindow key={activeSession} sessionId={activeSession} />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}