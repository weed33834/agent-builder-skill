/**
 * L9 - Page Header Component
 * 
 * Displays the app name and current session title, and provides a sidebar toggle button.
 */

interface HeaderProps {
  onToggleSidebar: () => void
  sessionTitle: string
  children?: React.ReactNode
}

export function Header({ onToggleSidebar, sessionTitle, children }: HeaderProps) {
  return (
    <header className="app-header">
      <button className="sidebar-toggle" onClick={onToggleSidebar} title="Session list">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
      <div className="header-brand">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" className="header-logo">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <h1 className="header-title">Agent Builder</h1>
      </div>
      <div className="header-session">{sessionTitle}</div>
      {children && <div className="header-children">{children}</div>}
    </header>
  )
}