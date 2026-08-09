/** SSE 事件类型 - 对应 L8 API 层的事件 */
export type SSEEventType =
  | 'token'       // L1/L2: LLM 流式输出 Token
  | 'tool_start'  // L5: 工具调用开始
  | 'tool_end'    // L5: 工具调用结束
  | 'thinking'    // L3: LLM 正在推理
  | 'node_start'  // L4: Agent 节点开始
  | 'node_end'    // L4: Agent 节点结束
  | 'done'        // L8: 流结束
  | 'error'       // 错误

/** SSE 事件数据 */
export interface SSEEvent {
  type: SSEEventType
  content?: string
  thread_id?: string
  tool_calls?: number
  tool?: string
  input?: string
  output?: string
  node?: string
}

/** 消息角色 - L9 UI 层 */
export type MessageRole = 'user' | 'assistant' | 'system'

/** 消息 - L9 UI 层 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  toolCalls?: ToolCallInfo[]
  isStreaming?: boolean
}

/** 工具调用信息 - L5+L9 跨层 */
export interface ToolCallInfo {
  tool: string
  input: string
  output?: string
  status: 'running' | 'completed' | 'error'
  error?: string
}

/** 会话 - L9 UI 层 */
export interface Session {
  id: string
  title: string
  createdAt: Date
}

/** Agent 配置 - 从 L8 API /api/config 获取 */
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
}
