/** SSE event types - corresponds to the L8 API layer events */
export type SSEEventType =
  | 'token'           // L1/L2: LLM streaming output token
  | 'content_block'   // L2: content block (LangGraph v2 streaming block)
  | 'tool_start'      // L5: tool call start
  | 'tool_end'        // L5: tool call end
  | 'tool_progress'   // L5: tool call progress update
  | 'thinking'        // L3: LLM is reasoning
  | 'node_start'      // L4: Agent node start
  | 'node_end'        // L4: Agent node end
  | 'a2a_task'        // A2A: remote Agent task delegation
  | 'a2a_update'      // A2A: remote Agent task status update
  | 'subagent_call'   // A2A: sub-agent call
  | 'done'            // L8: stream end
  | 'error'           // Error

/** Content block types - LangGraph v2 streaming protocol */
export type ContentBlockType = 'text' | 'code' | 'tool_use' | 'tool_result' | 'artifact'

/** Content block - LangGraph v2 streaming output */
export interface ContentBlock {
  type: ContentBlockType
  content: string
  language?: string          // Code language (for code type)
  tool_name?: string         // Tool name (for tool_use/tool_result type)
  artifact_type?: string     // Artifact type (for artifact type)
  metadata?: Record<string, unknown>
}

/** SSE event data */
export interface SSEEvent {
  type: SSEEventType
  content?: string
  content_block?: ContentBlock
  thread_id?: string
  tool_calls?: number
  tool?: string
  tool_id?: string
  input?: string
  output?: string
  progress?: number          // Tool call progress 0-100
  node?: string
  /** A2A task fields */
  a2a_task_id?: string
  a2a_task_status?: A2ATaskStatus
  a2a_agent_id?: string
  a2a_agent_name?: string
  a2a_result?: string
  /** Sub-agent call fields */
  subagent_id?: string
  subagent_name?: string
  parent_id?: string
  subagent_input?: string
  subagent_output?: string
  subagent_status?: SubagentStatus
  /** Error */
  error_code?: string
}

/** Message role - L9 UI layer */
export type MessageRole = 'user' | 'assistant' | 'system'

/** Rich content types */
export type RichContentType = 'text' | 'code' | 'tool_result' | 'artifact'

/** Rich content block */
export interface RichContentBlock {
  id: string
  type: RichContentType
  content: string
  language?: string
  artifact_type?: string
  metadata?: Record<string, unknown>
}

/** Message - L9 UI layer */
export interface Message {
  id: string
  role: MessageRole
  content: string
  richContent?: RichContentBlock[]  // Structured rich content
  timestamp: Date
  toolCalls?: ToolCallInfo[]
  a2aTasks?: A2ATaskInfo[]
  subagentCalls?: SubagentCallInfo[]
  isStreaming?: boolean
  /** Optimistic update flag */
  isOptimistic?: boolean
}

/** Tool call info - L5+L9 cross-layer */
export interface ToolCallInfo {
  id: string
  tool: string
  input: string
  output?: string
  status: 'running' | 'completed' | 'error' | 'cancelled'
  error?: string
  /** Progress 0-100 */
  progress?: number
  /** Start time */
  startedAt?: Date
}

/** A2A task status */
export type A2ATaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

/** A2A task info - Agent-to-Agent delegation */
export interface A2ATaskInfo {
  taskId: string
  agentId: string
  agentName: string
  status: A2ATaskStatus
  input: string
  output?: string
  error?: string
  progress?: number
  startedAt: Date
  completedAt?: Date
}

/** Sub-agent call status */
export type SubagentStatus = 'pending' | 'running' | 'completed' | 'failed'

/** Sub-agent call info - hierarchical call tree */
export interface SubagentCallInfo {
  id: string
  name: string
  parentId: string | null
  input: string
  output?: string
  status: SubagentStatus
  children: SubagentCallInfo[]
  startedAt: Date
  completedAt?: Date
}

/** Session - L9 UI layer (extended for workspace G1-G5) */
export interface Session {
  id: string
  title: string
  createdAt: Date
  groupId?: string
  favorite?: boolean
  updatedAt?: Date
}

/** MCP server connection status */
export interface MCPConnection {
  serverId: string
  serverName: string
  status: 'connected' | 'disconnected' | 'error'
  tools: number
  lastPing?: Date
  error?: string
}

/** MCP tool descriptor */
export interface MCPToolDescriptor {
  name: string
  description: string
  serverId: string
  serverName: string
  inputSchema: Record<string, unknown>
}

/** Agent configuration - obtained from the L8 API /api/config */
export interface AgentConfig {
  name: string
  type: string
  description: string
  ui: {
    type: string
    title: string
    features: string[]
  }
  llm?: {
    provider: string
    model: string
  }
  tools?: {
    count: number
  }
  a2a?: {
    enabled: boolean
    agents: { id: string; name: string; description: string }[]
  }
  mcp?: {
    servers: { id: string; name: string; status: string }[]
  }
}

/** File upload info */
export interface FileUploadInfo {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadProgress: number
  status: 'uploading' | 'uploaded' | 'error'
  error?: string
}

/* ========================================
   Workspace & productivity domain (deep-spec 15 / 16)
   TaskCard / WorkspacePanel / SkillSidebar / NotificationBell /
   CommandPalette / CanvasView / MemoryPanel
   ======================================== */

export interface TaskStep {
  name: string
  status: 'running' | 'done' | 'failed'
  detail?: string
  ts?: number
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface AgentTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  progress: number
  steps: TaskStep[]
  result?: string
  error?: string
  created_at?: number
  updated_at?: number
  started_at?: number | null
  finished_at?: number | null
}

export interface Workspace {
  id: string
  name: string
  type: 'dept' | 'project' | 'personal'
  description?: string
  owner?: string
  quota?: { agents?: number; kbs?: number; members?: number }
  members?: { id: string; role: string }[]
  resources?: { agents?: number; kbs?: number; sessions?: number }
  created_at?: number
}

export type SkillKind = 'expert' | 'skill' | 'connector'

export interface SkillItem {
  id: string
  kind: SkillKind
  name: string
  description?: string
  tags?: string[]
  config?: Record<string, unknown>
  enabled?: boolean
}

export interface AppNotification {
  id: string
  title: string
  body?: string
  level: 'info' | 'success' | 'warning' | 'error'
  module?: string
  link?: string
  read?: boolean
  created_at?: number
}

export interface CanvasNodeData {
  id: string
  type: string
  label: string
  x: number
  y: number
  data?: Record<string, unknown>
}

export interface CanvasEdgeData {
  id: string
  source: string
  target: string
  label?: string
}

export interface CanvasDoc {
  id: string
  name: string
  description?: string
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
  created_at?: number
}
