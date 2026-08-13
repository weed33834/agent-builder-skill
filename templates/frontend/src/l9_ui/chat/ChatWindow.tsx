/**
 * L9 - Chat Window Component
 * 
 * Core interaction container, responsible for:
 * 1. L8: Calling the API client
 * 2. L9: Managing message state and rendering
 * 3. Real-time streaming token rendering (requestAnimationFrame throttling)
 * 4. Tool call visualization + progress tracking
 * 5. A2A remote task visualization
 * 6. Hierarchical sub-agent call tree visualization
 * 7. React 19 useOptimistic optimistic updates
 * 8. AbortController cancellation support
 */

import { useState, useRef, useEffect, useCallback, useOptimistic, useTransition } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput, type ChatMode } from './ChatInput'
import { ToolCall } from './ToolCall'
import { streamChat } from '../../l8_api/api'
import type { Message, ToolCallInfo, A2ATaskInfo, SubagentCallInfo } from '../../types'

interface ChatWindowProps {
  sessionId: string
  showToolViz?: boolean
  showFileUpload?: boolean
  showChartDisplay?: boolean
  showA2APanel?: boolean
}

export function ChatWindow({
  sessionId: _sessionId,
  showToolViz = true,
  showFileUpload = false,
  showChartDisplay: _showChartDisplay = false,
  showA2APanel = true,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am an intelligent assistant. I can help you search for information, fetch web content, perform calculations, and more. How can I help you?',
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>()
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state: Message[], newMessage: Message) => [...state, newMessage]
  )
  const [, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFrameRef = useRef<number>(0)
  const pendingContentRef = useRef('')

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  /**
   * requestAnimationFrame throttled message content update
   * Avoids performance issues caused by high-frequency SSE token updates
   */
  const updateMessageContent = useCallback((messageId: string, content: string) => {
    pendingContentRef.current = content
    const now = performance.now()
    if (now - lastFrameRef.current < 16) return // ~60fps

    lastFrameRef.current = now
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, content: pendingContentRef.current }
          : m
      )
    )
  }, [])

  /**
   * Cancel the current request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const handleSend = async (content: string, mode?: ChatMode) => {
    // Cancel the previous request
    cancelRequest()

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Add the user message (optimistic update)
    const userMessageId = crypto.randomUUID()
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content,
      timestamp: new Date(),
      isOptimistic: true,
    }
    // React 19 useOptimistic
    startTransition(() => {
      addOptimisticMessage(userMessage)
    })
    // Also update the actual state
    setMessages(prev => [...prev, { ...userMessage, isOptimistic: false }])
    setIsLoading(true)

    // Create the assistant message (streaming)
    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
      a2aTasks: [],
      subagentCalls: [],
    }
    setMessages(prev => [...prev, assistantMessage])
    let currentToolCalls: ToolCallInfo[] = []
    let currentA2ATasks: A2ATaskInfo[] = []
    let currentSubagentCalls: SubagentCallInfo[] = []

    try {
      // L8 API: SSE streaming events (supports content-block mode + AbortController)
      for await (const event of streamChat(content, threadId, {
        contentBlockMode: true,
        signal: abortController.signal,
        mode,
      })) {
        // Check if cancelled
        if (abortController.signal.aborted) break

        switch (event.type) {
          // L1/L2: LLM token stream
          case 'token':
            updateMessageContent(assistantId, event.content || '')
            break

          // L2: LangGraph v2 Content-Block stream
          case 'content_block':
            if (event.content_block) {
              const { content_block } = event
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: content_block.type === 'text'
                          ? m.content + (content_block.content || '')
                          : m.content,
                        richContent: [
                          ...(m.richContent || []),
                          {
                            id: crypto.randomUUID(),
                            type: content_block.type === 'tool_result' ? 'tool_result'
                              : content_block.type === 'artifact' ? 'artifact'
                              : content_block.type === 'code' ? 'code'
                              : 'text',
                            content: content_block.content,
                            language: content_block.language,
                            artifact_type: content_block.artifact_type,
                            metadata: content_block.metadata,
                          },
                        ],
                      }
                    : m
                )
              )
            }
            break

          // L5: Tool call start
          case 'tool_start':
            if (showToolViz) {
              const toolCall: ToolCallInfo = {
                id: event.tool_id || crypto.randomUUID(),
                tool: event.tool || '',
                input: event.input || '',
                status: 'running',
                progress: 0,
                startedAt: new Date(),
              }
              currentToolCalls = [...currentToolCalls, toolCall]
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...currentToolCalls] }
                    : m
                )
              )
            }
            break

          // L5: Tool call progress update
          case 'tool_progress':
            if (showToolViz && event.tool_id) {
              currentToolCalls = currentToolCalls.map(tc =>
                tc.id === event.tool_id
                  ? { ...tc, progress: event.progress ?? tc.progress }
                  : tc
              )
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...currentToolCalls] }
                    : m
                )
              )
            }
            break

          // L5: Tool call end
          case 'tool_end':
            if (showToolViz) {
              // Match by tool_id precisely, or fall back to matching the last running one by name
              if (event.tool_id) {
                currentToolCalls = currentToolCalls.map(tc =>
                  tc.id === event.tool_id
                    ? { ...tc, output: event.output, status: 'completed' as const }
                    : tc
                )
              } else {
                for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                  if (currentToolCalls[i].tool === event.tool && currentToolCalls[i].status === 'running') {
                    currentToolCalls = [...currentToolCalls]
                    currentToolCalls[i] = {
                      ...currentToolCalls[i],
                      output: event.output,
                      status: 'completed' as const,
                    }
                    break
                  }
                }
              }
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...currentToolCalls] }
                    : m
                )
              )
            }
            break

          // A2A: Remote task delegation
          case 'a2a_task':
            if (showA2APanel && event.a2a_task_id) {
              const a2aTask: A2ATaskInfo = {
                taskId: event.a2a_task_id,
                agentId: event.a2a_agent_id || 'unknown',
                agentName: event.a2a_agent_name || event.a2a_agent_id || 'Remote Agent',
                status: 'pending',
                input: event.input || '',
                progress: 0,
                startedAt: new Date(),
              }
              currentA2ATasks = [...currentA2ATasks, a2aTask]
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, a2aTasks: [...currentA2ATasks] }
                    : m
                )
              )
            }
            break

          // A2A: Remote task status update
          case 'a2a_update':
            if (showA2APanel && event.a2a_task_id) {
              currentA2ATasks = currentA2ATasks.map(task =>
                task.taskId === event.a2a_task_id
                  ? {
                      ...task,
                      status: event.a2a_task_status || task.status,
                      output: event.a2a_result || task.output,
                      progress: event.progress ?? task.progress,
                      completedAt: event.a2a_task_status === 'completed' || event.a2a_task_status === 'failed'
                        ? new Date()
                        : undefined,
                    }
                  : task
              )
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, a2aTasks: [...currentA2ATasks] }
                    : m
                )
              )
            }
            break

          // Sub-agent hierarchical call
          case 'subagent_call':
            const subagentInfo: SubagentCallInfo = {
              id: event.subagent_id || crypto.randomUUID(),
              name: event.subagent_name || event.subagent_id || 'Sub-agent',
              parentId: event.parent_id || null,
              input: event.subagent_input || '',
              output: event.subagent_output,
              status: (event.subagent_status as SubagentCallInfo['status']) || 'running',
              children: [],
              startedAt: new Date(),
              completedAt: event.subagent_status === 'completed' || event.subagent_status === 'failed'
                ? new Date()
                : undefined,
            }

            // Build the call tree
            if (subagentInfo.parentId) {
              const addToTree = (nodes: SubagentCallInfo[]): SubagentCallInfo[] =>
                nodes.map(n => {
                  if (n.id === subagentInfo.parentId) {
                    return { ...n, children: [...n.children, subagentInfo] }
                  }
                  if (n.children.length > 0) {
                    return { ...n, children: addToTree(n.children) }
                  }
                  return n
                })
              currentSubagentCalls = addToTree(currentSubagentCalls)
            } else {
              currentSubagentCalls = [...currentSubagentCalls, subagentInfo]
            }

            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, subagentCalls: [...currentSubagentCalls] }
                  : m
              )
            )
            break

          // L8: Stream end
          case 'done':
            if (event.thread_id) {
              setThreadId(event.thread_id)
            }
            // Final content flush
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content + (pendingContentRef.current ? '' : ''),
                      isStreaming: false,
                    }
                  : m
              )
            )
            setIsLoading(false)
            break

          // L8: Error event
          case 'error':
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content || `Server error: ${event.content || 'Unknown error'}`,
                      isStreaming: false,
                    }
                  : m
              )
            )
            setIsLoading(false)
            break
        }
      }
    } catch (error) {
      // Ignore AbortError (user-initiated cancellation)
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content || `Connection error: ${error}`, isStreaming: false }
            : m
        )
      )
    } finally {
      abortControllerRef.current = null
      // Ensure streaming state is cleaned up
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId && m.isStreaming
            ? { ...m, isStreaming: false }
            : m
        )
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-window">
      <div className="messages-container">
        {optimisticMessages.map(msg => (
          <div key={msg.id} className={`message-wrapper ${msg.isOptimistic ? 'optimistic' : ''}`}>
            <MessageBubble message={msg} />
            {/* Tool call visualization */}
            {showToolViz && msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="tool-calls-container">
                {msg.toolCalls.map(tc => (
                  <ToolCall key={tc.id} info={tc} />
                ))}
              </div>
            )}
            {/* A2A task visualization */}
            {showA2APanel && msg.a2aTasks && msg.a2aTasks.length > 0 && (
              <div className="a2a-tasks-container">
                <div className="a2a-tasks-header">Remote Agent Tasks</div>
                {msg.a2aTasks.map(task => (
                  <div key={task.taskId} className={`a2a-task-item ${task.status}`}>
                    <div className="a2a-task-header">
                      <span className="a2a-task-agent">{task.agentName}</span>
                      <span className={`a2a-task-status status-${task.status}`}>
                        {task.status === 'pending' && '⏳ Pending'}
                        {task.status === 'running' && '🔄 Running'}
                        {task.status === 'completed' && '✅ Completed'}
                        {task.status === 'failed' && '❌ Failed'}
                        {task.status === 'cancelled' && '⛔ Cancelled'}
                      </span>
                    </div>
                    {task.progress !== undefined && task.status === 'running' && (
                      <div className="a2a-progress-bar">
                        <div className="a2a-progress-fill" style={{ width: `${task.progress}%` }} />
                      </div>
                    )}
                    {task.output && (
                      <div className="a2a-task-output">{task.output}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Sub-agent call tree visualization */}
            {showA2APanel && msg.subagentCalls && msg.subagentCalls.length > 0 && (
              <div className="subagent-tree-container">
                <div className="subagent-tree-header">Agent Call Chain</div>
                {msg.subagentCalls.map(node => (
                  <SubagentTreeNode key={node.id} node={node} depth={0} />
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isLoading && (
        <div className="cancel-button-container">
          <button className="cancel-btn" onClick={cancelRequest} title="Stop generation">
            ⏹ Stop
          </button>
        </div>
      )}
      <ChatInput onSend={handleSend} disabled={isLoading} showFileUpload={showFileUpload} sessionId={_sessionId} />
    </div>
  )
}

/** Sub-agent tree node component */
function SubagentTreeNode({ node, depth }: { node: SubagentCallInfo; depth: number }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="subagent-tree-node" style={{ marginLeft: `${depth * 20}px` }}>
      <div
        className={`subagent-node-header status-${node.status}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="subagent-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="subagent-name">{node.name}</span>
        <span className={`subagent-status-indicator ${node.status}`}>
          {node.status === 'pending' && '⏳'}
          {node.status === 'running' && '🔄'}
          {node.status === 'completed' && '✓'}
          {node.status === 'failed' && '✗'}
        </span>
      </div>
      {expanded && (
        <div className="subagent-node-details">
          <div className="subagent-detail-label">Input</div>
          <pre className="subagent-detail-content">{node.input}</pre>
          {node.output && (
            <>
              <div className="subagent-detail-label">Output</div>
              <pre className="subagent-detail-content">{node.output}</pre>
            </>
          )}
          {node.children.length > 0 && (
            <div className="subagent-children">
              {node.children.map(child => (
                <SubagentTreeNode key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
