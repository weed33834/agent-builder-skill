/**
 * L8 - API 客户端
 * 
 * 通过 SSE 流式协议与后端 L8 API 层通信。
 * 负责将 HTTP SSE 事件流解析为 AsyncGenerator。
 */

import type { SSEEvent } from '../types'

const API_BASE = '/api'

/**
 * 流式聊天 API
 * L8 → L4 → L2 → L1 → L2 → L4 → L8 → L9
 */
export async function* streamChat(
  message: string,
  threadId?: string
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, thread_id: threadId }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Chat request failed: ${response.status} ${errorText}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6)) as SSEEvent
          yield data
        } catch {
          console.warn('Failed to parse SSE line:', trimmed)
        }
      }
    }
  }
}

/**
 * 重置会话
 */
export async function resetChat(threadId?: string): Promise<string> {
  const response = await fetch(`${API_BASE}/chat/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ thread_id: threadId }),
  })

  if (!response.ok) {
    throw new Error('Failed to reset chat')
  }

  const data = await response.json()
  return data.thread_id
}