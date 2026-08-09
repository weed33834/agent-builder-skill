/**
 * L8 - API Client
 * 
 * Communicates with the backend L8 API layer via the SSE streaming protocol.
 * Supports:
 * - Legacy SSE token streaming (backward compatible)
 * - LangGraph v2 content-block streaming protocol
 * - A2A remote task polling
 * - MCP tool discovery
 * - Streaming / non-streaming dual mode
 */

import type { SSEEvent, AgentConfig, MCPToolDescriptor, A2ATaskInfo } from '../types'

const API_BASE = '/api'

/** Chat request options */
export interface ChatOptions {
  message: string
  threadId?: string
  /** Streaming mode: streaming or non-streaming */
  mode?: 'streaming' | 'non-streaming'
  /** Whether to enable the LangGraph v2 content-block protocol */
  contentBlockMode?: boolean
  /** AbortController signal */
  signal?: AbortSignal
}

/**
 * Streaming chat API (v2)
 * Supports the LangGraph v2 Content-Block streaming protocol + legacy token streaming
 * 
 * Event stream:
 *   content_block → pushed per block (text/code/tool call/artifact)
 *   token → legacy token-granularity push
 *   tool_start/tool_end → tool call lifecycle
 *   a2a_task/a2a_update → A2A remote tasks
 *   subagent_call → sub-agent call tree
 *   done → stream end
 */
export async function* streamChat(
  message: string,
  threadId?: string,
  options?: { contentBlockMode?: boolean; signal?: AbortSignal }
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      thread_id: threadId,
      stream: true,
      content_block_mode: options?.contentBlockMode ?? true,
    }),
    signal: options?.signal,
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
 * Non-streaming chat API
 * Suitable for scenarios that do not require real-time rendering; returns the full result at once
 */
export async function chat(
  message: string,
  threadId?: string,
  options?: { signal?: AbortSignal }
): Promise<{
  content: string
  thread_id: string
  tool_calls?: { tool: string; input: string; output: string }[]
  a2a_tasks?: A2ATaskInfo[]
}> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      thread_id: threadId,
      stream: false,
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Chat request failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Reset the session
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

/**
 * A2A task polling
 * Queries the execution status and result of a delegated remote Agent task
 */
export async function pollA2ATask(
  taskId: string
): Promise<A2ATaskInfo> {
  const response = await fetch(`${API_BASE}/a2a/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`A2A task poll failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Batch-poll multiple A2A tasks
 */
export async function pollA2ATasks(
  taskIds: string[]
): Promise<A2ATaskInfo[]> {
  const response = await fetch(`${API_BASE}/a2a/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_ids: taskIds }),
  })

  if (!response.ok) {
    throw new Error(`A2A tasks poll failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Cancel an A2A task
 */
export async function cancelA2ATask(
  taskId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/a2a/tasks/${taskId}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`A2A task cancel failed: ${response.status}`)
  }
}

/**
 * MCP tool discovery
 * Retrieves the list of currently available MCP tools
 */
export async function discoverMCPTools(): Promise<MCPToolDescriptor[]> {
  const response = await fetch(`${API_BASE}/mcp/tools`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    return []
  }

  return response.json()
}

/**
 * MCP server connection status
 */
export async function getMCPStatus(): Promise<{
  servers: { id: string; name: string; status: 'connected' | 'disconnected' | 'error'; tools: number; error?: string }[]
}> {
  const response = await fetch(`${API_BASE}/mcp/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    return { servers: [] }
  }

  return response.json()
}

/**
 * Get the Agent configuration
 * The frontend dynamically renders UI features based on this configuration
 */
export async function getAgentConfig(): Promise<AgentConfig> {
  const response = await fetch(`${API_BASE}/config`)
  if (!response.ok) {
    return {
      name: 'Agent',
      type: 'chat',
      description: '',
      ui: {
        type: 'chat',
        title: 'Agent',
        features: ['session_management', 'tool_visualization'],
      },
    }
  }
  return response.json()
}
