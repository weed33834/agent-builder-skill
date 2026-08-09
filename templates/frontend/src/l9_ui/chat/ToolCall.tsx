/**
 * L9 - Tool Call Visualization Component
 * 
 * Displays the execution status and details of L5-layer tool calls.
 * Features:
 * - Expand/collapse to view input and output
 * - Real-time progress bar (for long-running tasks)
 * - Retry/cancel buttons
 * - A2A task delegation visualization
 * - Hierarchical sub-agent call tree (expandable/collapsible)
 */

import { useState } from 'react'
import type { ToolCallInfo } from '../../types'

interface ToolCallProps {
  info: ToolCallInfo
  onRetry?: (toolCallId: string) => void
  onCancel?: (toolCallId: string) => void
}

export function ToolCall({ info, onRetry, onCancel }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = info.status === 'running'
  const isError = info.status === 'error'
  const isCancelled = info.status === 'cancelled'
  const isCompleted = info.status === 'completed'

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'web_search': return '🔍'
      case 'web_fetch': return '🌐'
      case 'current_time': return '🕐'
      case 'calculate': return '📐'
      default: return '🔧'
    }
  }

  const getToolLabel = (tool: string) => {
    switch (tool) {
      case 'web_search': return 'Search the web'
      case 'web_fetch': return 'Fetch web page'
      case 'current_time': return 'Get time'
      case 'calculate': return 'Math calculation'
      default: return tool
    }
  }

  const getStatusLabel = () => {
    if (isRunning) return 'Running...'
    if (isCompleted) return 'Completed'
    if (isError) return 'Failed'
    if (isCancelled) return 'Cancelled'
    return ''
  }

  return (
    <div className={`tool-call ${info.status}`}>
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">{getToolIcon(info.tool)}</span>
        <span className="tool-name">{getToolLabel(info.tool)}</span>
        <span className="tool-status-label">{getStatusLabel()}</span>
        {isRunning && <span className="tool-spinner" />}
        {isCompleted && <span className="tool-check">✓</span>}
        {isError && <span className="tool-error">✗</span>}
        {isCancelled && <span className="tool-cancelled">⛔</span>}
        <span className="tool-expand">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* Progress bar (long-running tasks) */}
      {isRunning && info.progress !== undefined && info.progress > 0 && (
        <div className="tool-progress-bar">
          <div className="tool-progress-fill" style={{ width: `${info.progress}%` }} />
          <span className="tool-progress-text">{info.progress}%</span>
        </div>
      )}

      {/* Action buttons: retry / cancel */}
      <div className="tool-call-actions">
        {isRunning && onCancel && (
          <button
            className="tool-action-btn cancel"
            onClick={(e) => { e.stopPropagation(); onCancel(info.id) }}
            title="Cancel"
          >
            ⏹ Cancel
          </button>
        )}
        {isError && onRetry && (
          <button
            className="tool-action-btn retry"
            onClick={(e) => { e.stopPropagation(); onRetry(info.id) }}
            title="Retry"
          >
            🔄 Retry
          </button>
        )}
      </div>

      {expanded && (
        <div className="tool-call-details">
          <div className="tool-detail-section">
            <div className="detail-label">Input</div>
            <pre className="detail-content">{info.input}</pre>
          </div>
          {info.output && (
            <div className="tool-detail-section">
              <div className="detail-label">Output</div>
              <pre className="detail-content">{info.output}</pre>
            </div>
          )}
          {info.error && (
            <div className="tool-detail-section error">
              <div className="detail-label">Error</div>
              <pre className="detail-content">{info.error}</pre>
            </div>
          )}
          {info.startedAt && (
            <div className="tool-detail-section">
              <div className="detail-label">Start time</div>
              <div className="detail-content">
                {info.startedAt.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
