/**
 * L9 - 聊天窗口组件
 * 
 * 核心交互容器，负责：
 * 1. L8: 调用 API 客户端
 * 2. L9: 管理消息状态和渲染
 * 3. 流式 Token 实时渲染
 * 4. 工具调用可视化
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ToolCall } from './ToolCall'
import { streamChat } from '../../l8_api/api'
import type { Message, ToolCallInfo } from '../../types'

interface ChatWindowProps {
  sessionId: string
}

export function ChatWindow(_props: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是智能助手。我可以帮你搜索信息、获取网页内容、进行数学计算等。请告诉我你需要什么帮助？',
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (content: string) => {
    // 添加用户消息
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // 创建助手消息（流式）
    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
    }
    setMessages(prev => [...prev, assistantMessage])
    let currentToolCalls: ToolCallInfo[] = []

    try {
      // L8 API: SSE 流式事件
      for await (const event of streamChat(content, threadId)) {
        switch (event.type) {
          // L1/L2: LLM Token 流
          case 'token':
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + (event.content || '') }
                  : m
              )
            )
            break

          // L5: 工具调用开始
          case 'tool_start':
            const toolCall: ToolCallInfo = {
              tool: event.tool || '',
              input: event.input || '',
              status: 'running',
            }
            currentToolCalls = [...currentToolCalls, toolCall]
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...currentToolCalls] }
                  : m
              )
            )
            break

          // L5: 工具调用结束
          case 'tool_end':
            currentToolCalls = currentToolCalls.map(tc =>
              tc.tool === event.tool
                ? { ...tc, output: event.output, status: 'completed' }
                : tc
            )
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...currentToolCalls] }
                  : m
              )
            )
            break

          // L8: 流结束
          case 'done':
            if (event.thread_id) {
              setThreadId(event.thread_id)
            }
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, isStreaming: false }
                  : m
              )
            )
            setIsLoading(false)
            break
        }
      }
    } catch (error) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content || `连接错误: ${error}`, isStreaming: false }
            : m
        )
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="tool-calls-container">
                {msg.toolCalls.map((tc, i) => (
                  <ToolCall key={i} info={tc} />
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  )
}