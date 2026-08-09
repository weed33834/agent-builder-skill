/**
 * L9 - 错误边界组件
 * 
 * 捕获 React 组件树中的错误，防止整个应用崩溃。
 * 显示友好的错误提示和恢复按钮。
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
          <h2>应用出现错误</h2>
          <p className="error-message">{this.state.error?.message}</p>
          <button
            className="error-retry-btn"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            重新加载
          </button>
        </div>
      )
    }

    return this.props.children
  }
}