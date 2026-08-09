/**
 * L9 - 工具调用可视化组件
 * 
 * 展示 L5 层工具调用的执行状态和详情。
 * 支持展开/折叠查看输入输出。
 */

import { useState } from 'react'
import type { ToolCallInfo } from '../../types'

interface ToolCallProps {
  info: ToolCallInfo
}

export function ToolCall({ info }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = info.status === 'running'

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
      case 'web_search': return '搜索网页'
      case 'web_fetch': return '获取网页'
      case 'current_time': return '获取时间'
      case 'calculate': return '数学计算'
      default: return tool
    }
  }

  return (
    <div className={`tool-call ${info.status}`}>
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">{getToolIcon(info.tool)}</span>
        <span className="tool-name">{getToolLabel(info.tool)}</span>
        {isRunning && <span className="tool-spinner" />}
        {info.status === 'completed' && <span className="tool-check">✓</span>}
        {info.status === 'error' && <span className="tool-error">✗</span>}
        <span className="tool-expand">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div className="tool-call-details">
          <div className="tool-detail-section">
            <div className="detail-label">输入</div>
            <pre className="detail-content">{info.input}</pre>
          </div>
          {info.output && (
            <div className="tool-detail-section">
              <div className="detail-label">输出</div>
              <pre className="detail-content">{info.output}</pre>
            </div>
          )}
          {info.error && (
            <div className="tool-detail-section error">
              <div className="detail-label">错误</div>
              <pre className="detail-content">{info.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}