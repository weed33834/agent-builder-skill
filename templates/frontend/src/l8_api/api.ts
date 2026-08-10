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

/**
 * Update the Agent runtime configuration (M8 配置面板)
 */
export async function updateAgentConfig(config: Record<string, unknown>): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) throw new Error(`update config failed: ${response.status}`)
  return response.json()
}

/**
 * Transcribe uploaded audio via the backend voice service (M12 语音)
 */
export async function transcribeAudio(file: Blob): Promise<{ text: string }> {
  const form = new FormData()
  form.append('file', file, 'recording.webm')
  const response = await fetch(`${API_BASE}/voice/transcribe`, { method: 'POST', body: form })
  if (!response.ok) throw new Error(`transcribe failed: ${response.status}`)
  return response.json()
}

/**
 * Synthesize assistant text into audio (M12 语音 TTS)
 */
export async function speakText(text: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/voice/speak?text=${encodeURIComponent(text)}`)
  if (!response.ok) throw new Error(`tts failed: ${response.status}`)
  return response.blob()
}

/* ========================================
   Admin Console API（管理控制台）
   Endpoints: /api/admin/* (GET / POST / PUT)
   对应后端 templates/backend/app/l8_api/routes/ 下的 admin 路由
   ======================================== */

interface AdminRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

/** 通用管理接口请求封装：统一 JSON 序列化与错误处理 */
async function adminRequest<T>(path: string, options?: AdminRequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Admin API ${options?.method ?? 'GET'} ${path} failed: ${response.status} ${text}`)
  }
  return response.json() as Promise<T>
}

/** 通用资源响应：{ items, total } */
export interface AdminListResult<T = Record<string, unknown>> {
  items: T[]
  total: number
}

/** 连通性测试结果（模型 / MCP 通用） */
export interface AdminTestResult {
  ok: boolean
  latency_ms: number
  message?: string
  detail?: Record<string, unknown>
}

/* ---- 提示词管理 /api/admin/prompts ---- */
export function adminListPrompts(): Promise<AdminListResult> {
  return adminRequest('/api/admin/prompts')
}
export function adminCreatePrompt(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/prompts', { method: 'POST', body: data })
}
export function adminUpdatePrompt(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest(`/api/admin/prompts/${id}`, { method: 'PUT', body: data })
}
export function adminDeletePrompt(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/prompts/${id}`, { method: 'DELETE' })
}
/** AI 生成：generate / optimize / rewrite / translate / review / fewshot / explain */
export function adminGeneratePrompt(data: {
  action: string
  source?: string
  params?: Record<string, unknown>
}): Promise<{ draft: string; summary: string; version: number }> {
  return adminRequest('/api/admin/prompts/generate', { method: 'POST', body: data })
}
/** 外部导入：file / url / market / git / platform */
export function adminImportPrompt(data: {
  channel: string
  payload?: Record<string, unknown>
}): Promise<{ imported: number; items: Record<string, unknown>[] }> {
  return adminRequest('/api/admin/prompts/import', { method: 'POST', body: data })
}

/* ---- 模型管理 /api/admin/models ---- */
export function adminListModels(): Promise<AdminListResult> {
  return adminRequest('/api/admin/models')
}
export function adminAddModel(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/models', { method: 'POST', body: data })
}
/** 连通性测试（实时 ping，返回延迟与错误） */
export function adminTestModel(data: {
  provider: string
  model?: string
  base_url?: string
  api_key?: string
}): Promise<AdminTestResult> {
  return adminRequest('/api/admin/models/test', { method: 'POST', body: data })
}

/** 删除模型（前后端对齐：后端有 DELETE，前端必须提供入口） */
export function adminDeleteModel(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/models/${id}`, { method: 'DELETE' })
}

/* ---- 工具管理 /api/admin/tools ---- */
export function adminListTools(): Promise<AdminListResult> {
  return adminRequest('/api/admin/tools')
}
export function adminRegisterTool(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/tools', { method: 'POST', body: data })
}
/** MCP 连接测试：探测远端工具列表 */
export function adminTestMCP(data: {
  transport: 'stdio' | 'http' | 'sse'
  command?: string
  url?: string
  config?: Record<string, unknown>
}): Promise<AdminTestResult> {
  return adminRequest('/api/admin/tools/mcp/connect', { method: 'POST', body: data })
}

/* ---- Agent 管理 /api/admin/agents ---- */
export function adminListAgents(): Promise<AdminListResult> {
  return adminRequest('/api/admin/agents')
}
export function adminSaveAgent(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/agents', { method: 'POST', body: data })
}
/** 流程图保存（节点+边拓扑） */
export function adminSaveAgentGraph(data: {
  agent_id: string
  nodes: unknown[]
  edges: unknown[]
}): Promise<{ ok: boolean; version: number }> {
  return adminRequest('/api/admin/agents/graph', { method: 'POST', body: data })
}

/* ---- 记忆管理 /api/admin/memory ---- */
export function adminGetMemory(): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/memory')
}
export function adminSaveMemory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/memory', { method: 'POST', body: data })
}
/** 检索测试：query → Top-K 召回结果 */
export function adminQueryMemory(data: {
  kb_id: string
  query: string
  top_k?: number
}): Promise<{ hits: { chunk_id: string; score: number; snippet: string; source: string }[] }> {
  return adminRequest('/api/admin/memory/query', { method: 'POST', body: data })
}

/* ---- 编排管理 /api/admin/workflows ---- */
export function adminListWorkflows(): Promise<AdminListResult> {
  return adminRequest('/api/admin/workflows')
}
export function adminSaveWorkflow(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/workflows', { method: 'POST', body: data })
}
/** 删除工作流（前后端对齐） */
export function adminDeleteWorkflow(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/workflows/${id}`, { method: 'DELETE' })
}

/* ---- 评估管理 /api/admin/evaluations ---- */
export function adminListEvaluations(): Promise<AdminListResult> {
  return adminRequest('/api/admin/evaluations')
}
export function adminSaveEvaluation(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/evaluations', { method: 'POST', body: data })
}
/** 执行评估：数据集 + Agent 版本 → 跑分报告 */
export function adminRunEvaluation(data: {
  dataset_id: string
  agent_version: string
  pass_threshold?: number
}): Promise<{ task_id: string; status: string; report?: Record<string, unknown> }> {
  return adminRequest('/api/admin/evaluations/run', { method: 'POST', body: data })
}

/* ---- 监控告警 /api/admin/metrics + /api/admin/alerts ---- */
export function adminGetMetrics(): Promise<{
  series: Record<string, { ts: string[]; values: number[] }>
  summary: Record<string, number>
}> {
  return adminRequest('/api/admin/metrics')
}
export function adminListAlerts(): Promise<AdminListResult> {
  return adminRequest('/api/admin/alerts')
}
export function adminSaveAlert(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/alerts', { method: 'POST', body: data })
}
/** 删除告警规则（前后端对齐） */
export function adminDeleteAlert(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/alerts/${id}`, { method: 'DELETE' })
}

/* ---- 系统设置 /api/admin/settings ---- */
export function adminGetSettings(): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/settings')
}
export function adminUpdateSettings(data: Record<string, unknown>): Promise<{ ok: boolean }> {
  return adminRequest('/api/admin/settings', { method: 'PUT', body: data })
}
