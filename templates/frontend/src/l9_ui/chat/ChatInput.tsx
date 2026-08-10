/**
 * L9 - Chat Input Component
 * 
 * Supports Enter to send, Shift+Enter for newline, and auto-resizing height.
 * Additional features:
 * - Drag & drop file upload
 * - Keyboard shortcut hints
 * - Character count / token count estimation
 * - File upload status management
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, DragEvent } from 'react'
import type { FileUploadInfo } from '../../types'
import { uploadAttachment } from '../../l8_api/api'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
  showFileUpload?: boolean
  sessionId?: string
}

/**
 * Simple token estimator
 * English ~ 1 token/4 chars, Chinese ~ 1 token/1.5 chars
 */
function estimateTokens(text: string): number {
  // Chinese characters (including Chinese punctuation)
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g) || []).length
  // Other characters (English, digits, spaces, etc.)
  const otherChars = text.length - chineseChars

  // Chinese ~ 1 token / 1.5 chars, English ~ 1 token / 4 chars
  return Math.ceil(chineseChars / 1.5 + otherChars / 4)
}

export function ChatInput({ onSend, disabled, showFileUpload = false, sessionId }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<FileUploadInfo[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const tokenCount = estimateTokens(input)
  const charCount = input.length

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    // Ctrl+Shift+/ toggles shortcut hints
    if (e.key === '/' && e.ctrlKey && e.shiftKey) {
      e.preventDefault()
      setShowShortcuts(prev => !prev)
    }
  }

  /** Drag & drop upload handler */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (!showFileUpload || disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    const newFiles: FileUploadInfo[] = droppedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      status: 'uploading' as const,
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Real upload via the L8 sessions attachment API (G5). Without a sessionId,
    // fall back to a simulated progress so the UI still demonstrates the flow.
    droppedFiles.forEach((file, idx) => {
      const fileInfo = newFiles[idx]
      if (sessionId) {
        uploadAttachment(sessionId, file)
          .then(() => {
            setFiles(prev =>
              prev.map(f => (f.id === fileInfo.id ? { ...f, uploadProgress: 100, status: 'uploaded' as const } : f))
            )
          })
          .catch(() => {
            setFiles(prev => prev.map(f => (f.id === fileInfo.id ? { ...f, status: 'error' as const } : f)))
          })
      } else {
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 30
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
            setFiles(prev =>
              prev.map(f =>
                f.id === fileInfo.id
                  ? { ...f, uploadProgress: 100, status: 'uploaded' as const }
                  : f
              )
            )
          } else {
            setFiles(prev =>
              prev.map(f =>
                f.id === fileInfo.id
                  ? { ...f, uploadProgress: Math.round(progress) }
                  : f
              )
            )
          }
        }, 300)
      }
    })
  }, [showFileUpload, disabled, sessionId])

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className={`chat-input-container ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & drop overlay hint */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <p>Drop to upload files</p>
          </div>
        </div>
      )}

      {/* Uploaded file list */}
      {files.length > 0 && (
        <div className="file-list">
          {files.map(file => (
            <div key={file.id} className={`file-item ${file.status}`}>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              {file.status === 'uploading' && (
                <div className="file-progress-bar">
                  <div className="file-progress-fill" style={{ width: `${file.uploadProgress}%` }} />
                </div>
              )}
              {file.status === 'uploaded' && <span className="file-check">✓</span>}
              <button className="file-remove" onClick={() => removeFile(file.id)} title="Remove file">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-toolbar">
        {showFileUpload && (
          <button className="toolbar-btn file-upload-btn" title="Upload file" type="button">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
        )}
        <button
          className="toolbar-btn shortcuts-btn"
          onClick={() => setShowShortcuts(!showShortcuts)}
          title="Shortcuts (Ctrl+Shift+/)"
          type="button"
        >
          ⌨
        </button>
      </div>

      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Type a message, press Enter to send..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          title="Send"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Character count / token count */}
      <div className="input-metrics">
        <span className="metric-item" title="Character count">{charCount} chars</span>
        <span className="metric-separator">·</span>
        <span className="metric-item" title="Estimated token count">~{tokenCount} tokens</span>
      </div>

      {/* Keyboard shortcuts panel */}
      {showShortcuts && (
        <div className="shortcuts-panel">
          <div className="shortcuts-header">
            <span>Keyboard Shortcuts</span>
            <button className="shortcuts-close" onClick={() => setShowShortcuts(false)}>✕</button>
          </div>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <kbd>Enter</kbd>
              <span>Send message</span>
            </div>
            <div className="shortcut-item">
              <kbd>Shift + Enter</kbd>
              <span>New line</span>
            </div>
            <div className="shortcut-item">
              <kbd>Ctrl + Shift + /</kbd>
              <span>Show/hide shortcuts</span>
            </div>
            <div className="shortcut-item">
              <kbd>Esc</kbd>
              <span>Cancel generation</span>
            </div>
          </div>
        </div>
      )}

      {disabled && (
        <div className="input-status">
          <span className="status-dot" />
          <span>L1-L10 call chain executing...</span>
        </div>
      )}
    </div>
  )
}
