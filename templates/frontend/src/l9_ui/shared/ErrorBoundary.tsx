/**
 * L9 - Error Boundary Component
 * 
 * Catches errors in the React component tree to prevent the entire app from crashing.
 * Displays a friendly error message and a recovery button.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-icon">⚠</div>
          <h2>Application Error</h2>
          <p className="error-message">{this.state.error?.message}</p>
          <button
            className="error-retry-btn"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}