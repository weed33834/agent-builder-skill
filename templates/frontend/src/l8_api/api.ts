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
export interface ChatModePayload {
  web_search?: boolean
  deep_think?: boolean
  kb_id?: string | null
  sandbox?: boolean
}

export async function* streamChat(
  message: string,
  threadId?: string,
  options?: { contentBlockMode?: boolean; signal?: AbortSignal; mode?: ChatModePayload }
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
      mode: options?.mode,
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
export function adminUpdateTool(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return adminRequest(`/api/admin/tools/${id}`, { method: 'PUT', body: data })
}
export function adminDeleteTool(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/tools/${id}`, { method: 'DELETE' })
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
export function adminDeleteAgent(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/agents/${id}`, { method: 'DELETE' })
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

/* ---- NLP & Algorithm (deep-spec 20-B/C/D) ---- */
export function nlpKeywords(data: {
  documents?: string[]
  text?: string
  top_n?: number
  method?: 'tfidf' | 'textrank' | 'hybrid'
}): Promise<{ keywords: { keyword: string; score: number; tf?: number; idf?: number }[]; method: string; count: number }> {
  return adminRequest('/api/nlp/keywords', { method: 'POST', body: data })
}
export function nlpAnalyze(text: string): Promise<{
  normalized: string; keywords_tfidf: unknown[]; keywords_textrank: unknown[]; summary: string[]; length: number
}> {
  return adminRequest('/api/nlp/analyze', { method: 'POST', body: { text } })
}
export function nlpSummary(data: { text: string; sentences?: number }): Promise<{ sentences: string[]; summary: string }> {
  return adminRequest('/api/nlp/summary', { method: 'POST', body: data })
}
export function nlpValidate(data: unknown, schema: Record<string, unknown>): Promise<{
  ok: boolean; errors?: { field: string; reason: string; message: string }[]; correct_prompt?: string; data?: unknown
}> {
  return adminRequest('/api/nlp/validate', { method: 'POST', body: { data, schema } })
}
export function nlpRetrieve(data: { query: string; kb_id?: string; chunks?: unknown[]; top_k?: number }): Promise<{
  hits: { chunk_id: string; doc_id: string; doc_name: string; score: number; snippet: string; citation: string }[]
}> {
  return adminRequest('/api/nlp/retrieve', { method: 'POST', body: data })
}

/* ========================================
   Session workspace (full-spec G1-G5)
   分组 / 搜索 / 收藏 / 分享 / 附件上传
   ======================================== */
export interface SessionMeta {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  group_id?: string
  favorite?: boolean
}
export function listSessions(params: { q?: string; group_id?: string; favorite?: boolean } = {}): Promise<SessionMeta[]> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.group_id) qs.set('group_id', params.group_id)
  if (params.favorite) qs.set('favorite', 'true')
  const q = qs.toString()
  return fetch(`${API_BASE}/sessions${q ? `?${q}` : ''}`).then(r => r.json())
}
export function createSession(title: string, groupId = ''): Promise<SessionMeta> {
  return fetch(`${API_BASE}/sessions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, group_id: groupId }),
  }).then(r => r.json())
}
export function updateSession(id: string, data: { title?: string; group_id?: string; favorite?: boolean }): Promise<SessionMeta> {
  return fetch(`${API_BASE}/sessions/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then(r => r.json())
}
export function deleteSession(id: string): Promise<{ deleted: boolean }> {
  return fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' }).then(r => r.json())
}
export function listSessionGroups(): Promise<{ items: { id: string; name: string; session_count: number }[] }> {
  return fetch(`${API_BASE}/sessions/groups`).then(r => r.json())
}
export function createShare(id: string): Promise<{ ok: boolean; share_token: string; url: string }> {
  return fetch(`${API_BASE}/sessions/${id}/share`, { method: 'POST' }).then(r => r.json())
}
export function revokeShare(id: string): Promise<{ ok: boolean }> {
  return fetch(`${API_BASE}/sessions/${id}/share`, { method: 'DELETE' }).then(r => r.json())
}
export function exportSession(id: string): Promise<string> {
  return fetch(`${API_BASE}/sessions/${id}/export`).then(r => r.text())
}
export interface Attachment { id: string; name: string; path: string; size: number; kind: string }
export function listAttachments(id: string): Promise<{ items: Attachment[] }> {
  return fetch(`${API_BASE}/sessions/${id}/files`).then(r => r.json())
}
export function uploadAttachment(id: string, file: File): Promise<{ ok: boolean; attachment: Attachment }> {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API_BASE}/sessions/${id}/files`, { method: 'POST', body: form }).then(r => r.json())
}
export function removeAttachment(id: string, attId: string): Promise<{ ok: boolean }> {
  return fetch(`${API_BASE}/sessions/${id}/files/${attId}`, { method: 'DELETE' }).then(r => r.json())
}

/* ========================================
   New admin endpoints (full-spec gaps M1-M13 / G11)
   ======================================== */
/** 提示词版本历史 / 回滚 / A/B (M2) */
export function adminListPromptVersions(id: string): Promise<{ prompt_id: string; versions: Record<string, unknown>[] }> {
  return adminRequest(`/api/admin/prompts/${id}/versions`)
}
export function adminRollbackPrompt(id: string, version: number): Promise<{ ok: boolean; current_version: number; content: string }> {
  return adminRequest(`/api/admin/prompts/${id}/rollback`, { method: 'POST', body: { version } })
}
export function adminSetPromptAB(id: string, data: { enabled: boolean; variants: Record<string, unknown>; traffic: number }): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/prompts/${id}/ab`, { method: 'POST', body: data })
}
/** 模型 key 池 / 回退链 (M1) */
export function adminManageModelKeys(id: string, action: 'add' | 'remove', key?: string, keyId?: string): Promise<{ ok: boolean; key_pool: unknown[] }> {
  return adminRequest(`/api/admin/models/${id}/keys`, { method: 'POST', body: { action, key, key_id: keyId } })
}
export function adminSetModelFallback(id: string, fallback: unknown[]): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/models/${id}/fallback`, { method: 'POST', body: { fallback } })
}
/** 知识库文档管理 (M5) */
export function adminListKBs(): Promise<AdminListResult<{ id: string; name: string; doc_count: number; chunk_count: number; embedding: string }>> {
  return adminRequest('/api/admin/memory/kbs')
}
export function adminCreateKB(data: { id?: string; name: string; chunk_size?: number; overlap?: number; embedding?: string }): Promise<{ ok: boolean; id: string }> {
  return adminRequest('/api/admin/memory/kbs', { method: 'POST', body: data })
}
export function adminDeleteKB(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/memory/kbs/${id}`, { method: 'DELETE' })
}
export function adminListKBDocs(kbId: string): Promise<AdminListResult<{ id: string; name: string; chunk_count: number }>> {
  return adminRequest(`/api/admin/memory/kbs/${kbId}/documents`)
}
export function adminAddKBDoc(kbId: string, data: { name?: string; content: string }): Promise<{ ok: boolean; doc_id: string; chunks: number }> {
  return adminRequest(`/api/admin/memory/kbs/${kbId}/documents`, { method: 'POST', body: data })
}
export function adminDeleteKBDoc(kbId: string, docId: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/memory/kbs/${kbId}/documents/${docId}`, { method: 'DELETE' })
}
/** 工具试跑 / 热加载 (M4) */
export function adminRunTool(id: string, params: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; error?: string; latency_ms: number }> {
  return adminRequest(`/api/admin/tools/${id}/run`, { method: 'POST', body: { params } })
}
export function adminReloadTools(dir?: string): Promise<{ ok: boolean; registered: number }> {
  return adminRequest('/api/admin/tools/reload', { method: 'POST', body: { dir } })
}
/** IAM 用户/API Key/权限矩阵/审计 (M11) */
export function adminListUsers(): Promise<AdminListResult> {
  return adminRequest('/api/admin/security/users')
}
export function adminCreateUser(data: { username: string; role?: string; email?: string }): Promise<{ ok: boolean }> {
  return adminRequest('/api/admin/security/users', { method: 'POST', body: data })
}
export function adminUpdateUser(id: string, data: { role?: string; status?: string }): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/security/users/${id}`, { method: 'PUT', body: data })
}
export function adminDeleteUser(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/security/users/${id}`, { method: 'DELETE' })
}
export function adminListAPIKeys(): Promise<AdminListResult> {
  return adminRequest('/api/admin/security/api_keys')
}
export function adminCreateAPIKey(data: { name?: string; scope?: string }): Promise<{ ok: boolean; id: string; key: string }> {
  return adminRequest('/api/admin/security/api_keys', { method: 'POST', body: data })
}
export function adminRevokeAPIKey(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/security/api_keys/${id}`, { method: 'DELETE' })
}
export function adminGetAuditLog(): Promise<AdminListResult> {
  return adminRequest('/api/admin/security/audit')
}
/** Agent AI 生成 / 导入 / 模板市场 / 发布 (M12) */
export function adminGenerateAgent(data: { description: string; kind?: string }): Promise<{ draft: Record<string, unknown>; yaml: string }> {
  return adminRequest('/api/admin/agents/generate', { method: 'POST', body: data })
}
export function adminImportAgent(data: { format: string; content: string; source?: string }): Promise<{ imported: number; items: unknown[] }> {
  return adminRequest('/api/admin/agents/import', { method: 'POST', body: data })
}
export function adminListAgentTemplates(): Promise<AdminListResult> {
  return adminRequest('/api/admin/agents/templates')
}
export function adminPublishAgent(id: string, data: { version?: number; traffic?: number }): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/agents/${id}/publish`, { method: 'POST', body: data })
}
/** A2A 注册表 / 任务监控 (M6) */
export function adminListA2A(): Promise<AdminListResult> {
  return adminRequest('/api/admin/a2a')
}
export function adminRegisterA2A(data: { name?: string; url: string }): Promise<{ ok: boolean }> {
  return adminRequest('/api/admin/a2a', { method: 'POST', body: data })
}
export function adminDeleteA2A(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/a2a/${id}`, { method: 'DELETE' })
}
export function adminListA2ATasks(): Promise<AdminListResult> {
  return adminRequest('/api/admin/a2a/tasks')
}
/** 告警历史 / Trace / 日志 / 漂移 (M9/M10) */
export function adminGetAlertHistory(): Promise<AdminListResult> {
  return adminRequest('/api/admin/alerts/history')
}
export function adminListTraces(): Promise<AdminListResult> {
  return adminRequest('/api/admin/traces')
}
export function adminGetLogs(): Promise<AdminListResult> {
  return adminRequest('/api/admin/logs')
}
export function adminGetDrift(): Promise<{ series: unknown[]; alerts: unknown[] }> {
  return adminRequest('/api/admin/drift')
}
/** 定时任务 (G11) */
export function adminListTasks(): Promise<AdminListResult> {
  return adminRequest('/api/admin/tasks')
}
export function adminCreateTask(data: { name: string; cron: string; action?: Record<string, unknown>; enabled?: boolean }): Promise<{ ok: boolean }> {
  return adminRequest('/api/admin/tasks', { method: 'POST', body: data })
}
export function adminDeleteTask(id: string): Promise<{ ok: boolean }> {
  return adminRequest(`/api/admin/tasks/${id}`, { method: 'DELETE' })
}
/** 备份 / 迁移 (M13) */
export function adminExportBackup(): Promise<Record<string, unknown>> {
  return adminRequest('/api/admin/backup')
}
export function adminRestoreBackup(bundle: Record<string, unknown>): Promise<{ ok: boolean; restored: number }> {
  return adminRequest('/api/admin/backup/restore', { method: 'POST', body: { bundle } })
}

/* ---- 成本计费 (deep-spec 23) ---- */
export function adminGetUsage(days = 7): Promise<{
  days: { date: string; input_tokens: number; output_tokens: number; cost_usd: number; requests: number }[]
  by_model: { model: string; requests: number; cost_usd: number; tokens: number }[]
  total_cost_usd: number; total_requests: number
  budget: { monthly_usd: number; enabled: boolean }
  monthly_spent_usd: number; budget_left_usd: number
}> {
  return adminRequest(`/api/admin/usage?days=${days}`)
}
export function adminSetBudget(data: { monthly_usd: number; enabled: boolean }): Promise<{ monthly_usd: number; enabled: boolean }> {
  return adminRequest('/api/admin/usage/budget', { method: 'POST', body: data })
}
/* ---- 安全扫描 (deep-spec 27) ---- */
export function securityScan(text: string): Promise<{
  injection: { flagged: boolean; severity: string; confidence: number; action: string; hits: { pattern: string; keyword?: string; weight: number }[] }
  pii: { count: number; found: Record<string, number> }
  content: { flagged: boolean; hits: string[] }
  blocked: boolean; redacted: string
}> {
  return adminRequest('/api/security/scan', { method: 'POST', body: { text } })
}
export function securityRedact(text: string): Promise<{ redacted: string; count: number; found: Record<string, number> }> {
  return adminRequest('/api/security/redact', { method: 'POST', body: { text } })
}
export function getCircuitBreakers(): Promise<{ items: { key: string; state: string; failures: number; failure_threshold: number }[] }> {
  return adminRequest('/api/security/breakers')
}

/* ========================================
   Workspace & productivity domain APIs
   tasks / workspaces / skills / notifications / canvas / memory
   ======================================== */
import type {
  AgentTask, Workspace, SkillItem, SkillKind, AppNotification, CanvasDoc,
} from '../types'

/* ---- Tasks (TaskCard) /api/tasks ---- */
export function listTasks(status?: string): Promise<{ items: AgentTask[]; total: number }> {
  const q = status ? `?status=${status}` : ''
  return fetch(`${API_BASE}/tasks${q}`).then(r => r.json())
}
export function createTask(data: { title: string; description?: string; steps?: unknown[] }): Promise<AgentTask> {
  return fetch(`${API_BASE}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function startTask(id: string): Promise<AgentTask> {
  return fetch(`${API_BASE}/tasks/${id}/start`, { method: 'POST' }).then(r => r.json())
}
export function completeTask(id: string, result: string): Promise<AgentTask> {
  return fetch(`${API_BASE}/tasks/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ result }) }).then(r => r.json())
}
export function failTask(id: string, error: string): Promise<AgentTask> {
  return fetch(`${API_BASE}/tasks/${id}/fail`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error }) }).then(r => r.json())
}
export function retryTask(id: string): Promise<AgentTask> {
  return fetch(`${API_BASE}/tasks/${id}/retry`, { method: 'POST' }).then(r => r.json())
}
export function cancelTask(id: string): Promise<AgentTask> {
  return fetch(`${API_BASE}/tasks/${id}/cancel`, { method: 'POST' }).then(r => r.json())
}
export function deleteTask(id: string): Promise<{ deleted: boolean }> {
  return fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' }).then(r => r.json())
}

/* ---- Workspaces (WorkspacePanel) /api/workspaces ---- */
export function listWorkspaces(params?: { type?: string; member?: string }): Promise<{ items: Workspace[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.type) qs.set('type', params.type)
  if (params?.member) qs.set('member', params.member)
  const q = qs.toString()
  return fetch(`${API_BASE}/workspaces${q ? `?${q}` : ''}`).then(r => r.json())
}
export function createWorkspace(data: { name: string; type?: string; description?: string; owner?: string; quota?: Record<string, number> }): Promise<Workspace> {
  return fetch(`${API_BASE}/workspaces`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function updateWorkspace(id: string, data: Record<string, unknown>): Promise<Workspace> {
  return fetch(`${API_BASE}/workspaces/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function deleteWorkspace(id: string): Promise<{ deleted: boolean }> {
  return fetch(`${API_BASE}/workspaces/${id}`, { method: 'DELETE' }).then(r => r.json())
}

/* ---- Skills (SkillSidebar) /api/skills ---- */
export function listSkills(kind?: SkillKind): Promise<{ items: SkillItem[]; total: number }> {
  const q = kind ? `?kind=${kind}` : ''
  return fetch(`${API_BASE}/skills${q}`).then(r => r.json())
}
export function createSkill(data: { kind: SkillKind; name: string; description?: string; tags?: string[]; config?: Record<string, unknown>; enabled?: boolean }): Promise<SkillItem> {
  return fetch(`${API_BASE}/skills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function updateSkill(kind: SkillKind, id: string, data: Record<string, unknown>): Promise<SkillItem> {
  return fetch(`${API_BASE}/skills/${kind}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function deleteSkill(kind: SkillKind, id: string): Promise<{ deleted: boolean }> {
  return fetch(`${API_BASE}/skills/${kind}/${id}`, { method: 'DELETE' }).then(r => r.json())
}

/* ---- Notifications (NotificationBell) /api/notifications ---- */
export function listNotifications(unreadOnly = false): Promise<{ items: AppNotification[]; total: number }> {
  return fetch(`${API_BASE}/notifications${unreadOnly ? '?unread_only=true' : ''}`).then(r => r.json())
}
export function getUnreadCount(): Promise<{ unread: number }> {
  return fetch(`${API_BASE}/notifications/unread_count`).then(r => r.json())
}
export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return fetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' }).then(r => r.json())
}
export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return fetch(`${API_BASE}/notifications/read_all`, { method: 'POST' }).then(r => r.json())
}

/* ---- Canvas (CanvasView) /api/canvas ---- */
export function listCanvases(): Promise<{ items: CanvasDoc[]; total: number }> {
  return fetch(`${API_BASE}/canvas`).then(r => r.json())
}
export function createCanvas(data: { name: string; description?: string; nodes?: unknown[]; edges?: unknown[] }): Promise<CanvasDoc> {
  return fetch(`${API_BASE}/canvas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function getCanvas(id: string): Promise<CanvasDoc> {
  return fetch(`${API_BASE}/canvas/${id}`).then(r => r.json())
}
export function updateCanvas(id: string, data: Record<string, unknown>): Promise<CanvasDoc> {
  return fetch(`${API_BASE}/canvas/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json())
}
export function deleteCanvas(id: string): Promise<{ deleted: boolean }> {
  return fetch(`${API_BASE}/canvas/${id}`, { method: 'DELETE' }).then(r => r.json())
}

/* ---- Memory (MemoryPanel) — reuse admin memory endpoints ---- */
export function listMemoryKBs(): Promise<AdminListResult<{ id: string; name: string; doc_count: number; chunk_count: number; embedding: string }>> {
  return adminRequest('/api/admin/memory/kbs')
}
