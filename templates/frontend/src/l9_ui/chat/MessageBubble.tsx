/**
 * L9 - 消息气泡组件
 * 
 * 展示单条消息，支持用户/助手两种角色样式。
 * 包含消息头像、角色标识、时间戳和复制功能。
 */

import { useState } from 'react'
import type { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar user-avatar">U</div>
        ) : (
          <div className="avatar assistant-avatar">AI</div>
        )}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? '你' : '助手'}</span>
          <span className="message-time">
            {message.timestamp.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="message-text">
          {message.content || (message.isStreaming ? '思考中...' : '')}
          {message.isStreaming && message.content && (
            <span className="typing-cursor">|</span>
          )}
        </div>
        {!isUser && message.content && !message.isStreaming && (
          <div className="message-actions">
            <button className="action-btn" onClick={handleCopy} title="复制">
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}