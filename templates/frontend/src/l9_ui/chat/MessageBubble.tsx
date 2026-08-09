/**
 * L9 - Message Bubble Component
 * 
 * Displays a single message, supporting both user/assistant role styles.
 * Features:
 * - Rich content rendering (text/code/tool_result/artifact)
 * - A2A artifact rendering
 * - Streaming content animated cursor indicator
 * - Copy functionality
 * - Code block syntax highlighting support
 */

import { useState } from 'react'
import type { Message, RichContentBlock } from '../../types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard API may be unavailable in non-HTTPS environments
      }
    }
  }

  const renderRichContent = (block: RichContentBlock) => {
    switch (block.type) {
      case 'code':
        return (
          <div className="rich-content code-block" key={block.id}>
            {block.language && <div className="code-lang-label">{block.language}</div>}
            <pre className="code-content"><code>{block.content}</code></pre>
          </div>
        )

      case 'tool_result':
        return (
          <div className="rich-content tool-result" key={block.id}>
            <div className="tool-result-label">Tool Call Result</div>
            <pre className="tool-result-content">{block.content}</pre>
          </div>
        )

      case 'artifact':
        return (
          <div className="rich-content artifact" key={block.id}>
            <div className="artifact-header">
              <span className="artifact-icon">📄</span>
              <span className="artifact-type">{block.artifact_type || 'Artifact'}</span>
            </div>
            <div className="artifact-body">
              {block.artifact_type === 'html' || block.artifact_type === 'svg' ? (
                <div className="artifact-preview" dangerouslySetInnerHTML={{ __html: block.content }} />
              ) : block.artifact_type === 'image' ? (
                <img className="artifact-image" src={block.content} alt="artifact" />
              ) : (
                <pre className="artifact-content"><code>{block.content}</code></pre>
              )}
            </div>
            {block.metadata && (
              <div className="artifact-metadata">
                {Object.entries(block.metadata).map(([key, val]) => (
                  <span key={key} className="artifact-meta-item">{key}: {String(val)}</span>
                ))}
              </div>
            )}
          </div>
        )

      case 'text':
      default:
        return (
          <span key={block.id} className="rich-content text-content">
            {block.content}
          </span>
        )
    }
  }

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'} ${message.isOptimistic ? 'optimistic' : ''}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar user-avatar">U</div>
        ) : (
          <div className="avatar assistant-avatar">AI</div>
        )}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
          <span className="message-time">
            {message.timestamp.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="message-text">
          {/* Rich content rendering (per block) */}
          {message.richContent && message.richContent.length > 0 ? (
            <div className="rich-content-container">
              {message.richContent.map(block => renderRichContent(block))}
            </div>
          ) : (
            /* Plain text content rendering */
            message.content || (message.isStreaming ? 'Thinking...' : '')
          )}

          {/* Streaming content animated cursor indicator */}
          {message.isStreaming && (
            <span className="streaming-cursor" aria-label="Generating">
              <span className="cursor-dot">▍</span>
            </span>
          )}
        </div>
        {!isUser && message.content && !message.isStreaming && (
          <div className="message-actions">
            <button className="action-btn" onClick={handleCopy} title="Copy">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
