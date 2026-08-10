/**
 * Agent 管理页面（M0.22 + M7.24）
 *
 * 布局：左侧 Agent 模板列表 + 右侧详情（基础信息 / 系统提示词 / 工具绑定 / 流程图）。
 * - 模板 CRUD（复用 adminSaveAgent）
 * - 流程图可视化编辑：节点 + 边拓扑（保存到 /api/admin/agents/graph）
 * - 多框架标注（langgraph / openai-agents / claude-sdk / adk / autogen / bare）
 * 接口：/api/admin/agents*（adminListAgents / adminSaveAgent / adminSaveAgentGraph）
 */

import { useState } from 'react'
import {
  adminListAgents, adminSaveAgent, adminDeleteAgent, adminSaveAgentGraph,
  adminGenerateAgent, adminImportAgent, adminListAgentTemplates, adminPublishAgent,
} from '../../l8_api/api'

interface GraphNode {
  id: string
  label: string
  kind: 'llm' | 'tool' | 'memory' | 'gate' | 'input' | 'output'
}

interface GraphEdge {
  from: string
  to: string
}

interface AgentTemplate {
  id: string
  name: string
  description: string
  system_prompt: string
  tools: string[]
  framework: string
  enabled: boolean
  graph?: { nodes: GraphNode[]; edges: GraphEdge[] }
}

const FRAMEWORKS = ['langgraph', 'openai-agents', 'claude-sdk', 'adk', 'autogen', 'bare']

const DEFAULT_GRAPH: GraphNode[] = [
  { id: 'input', label: '用户输入', kind: 'input' },
  { id: 'llm', label: 'LLM 主循环', kind: 'llm' },
  { id: 'output', label: '最终回复', kind: 'output' },
]

export function AgentGraph() {
  const [agents, setAgents] = useState<AgentTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>(DEFAULT_GRAPH)
  const [edges, setEdges] = useState<GraphEdge[]>([
    { from: 'input', to: 'llm' },
    { from: 'llm', to: 'output' },
  ])
  const [form, setForm] = useState({
    name: '',
    description: '',
    system_prompt: '',
    tools: '',
    framework: 'langgraph',
  })
  const [notice, setNotice] = useState('')
  const [generateDesc, setGenerateDesc] = useState('')
  const [templates, setTemplates] = useState<{ name: string; desc: string }[]>([])
  const [aiBusy, setAiBusy] = useState(false)

  const loadTemplates = async () => {
    try {
      const res = await adminListAgentTemplates()
      setTemplates((res.items as unknown as { name: string; desc: string }[]) || [])
    } catch {
      setTemplates([])
    }
  }
  void loadTemplates()

  const refresh = async () => {
    try {
      const res = await adminListAgents()
      setAgents(res.items as unknown as AgentTemplate[])
    } catch {
      setAgents([])
    }
  }
  void refresh()

  const selected = agents.find((a) => a.id === selectedId)

  const saveTemplate = async () => {
    if (!form.name) return
    try {
      await adminSaveAgent({
        name: form.name,
        description: form.description,
        system_prompt: form.system_prompt,
        tools: form.tools.split(',').map((s) => s.trim()).filter(Boolean),
        framework: form.framework,
      })
      setNotice(`模板「${form.name}」已保存`)
      setForm({ name: '', description: '', system_prompt: '', tools: '', framework: 'langgraph' })
      void refresh()
    } catch (e) {
      setNotice(`保存失败: ${String(e)}`)
    }
  }

  const saveGraph = async () => {
    if (!selectedId) return
    try {
      const res = await adminSaveAgentGraph({ agent_id: selectedId, nodes, edges })
      setNotice(`流程图已保存 (v${res.version})`)
    } catch (e) {
      setNotice(`流程图保存失败: ${String(e)}`)
    }
  }

  const addToolNode = () => {
    setNodes((prev) => [...prev, { id: `tool_${prev.length}`, label: '工具调用', kind: 'tool' }])
    setEdges((prev) => [...prev, { from: 'llm', to: `tool_${prev.length}` }])
  }

  const deleteAgent = async (id: string) => {
    try {
      await adminDeleteAgent(id)
      setNotice('Agent 已删除')
      setSelectedId(null)
      void refresh()
    } catch (e) {
      setNotice(`删除失败: ${String(e)}`)
    }
  }

  const generateAgent = async () => {
    if (!generateDesc.trim()) return
    setAiBusy(true)
    try {
      const res = await adminGenerateAgent({ description: generateDesc })
      const draft = res.draft as { name: string; description: string; system_prompt: string }
      setForm({ name: draft.name, description: draft.description, system_prompt: draft.system_prompt, tools: '', framework: 'langgraph' })
      setNotice('已根据描述生成 Agent 草稿，点击「保存模板」入库')
    } catch (e) {
      setNotice(`AI 生成失败: ${String(e)}`)
    } finally {
      setAiBusy(false)
    }
  }

  const importAgent = async () => {
    const yaml = window.prompt('粘贴 Agent 配置（YAML/JSON），或留空使用示例')
    try {
      await adminImportAgent({ format: 'yaml', content: yaml ?? 'name: imported\nsystem_prompt: "你是导入的 Agent"' })
      setNotice('Agent 已导入（草稿状态）')
      void refresh()
    } catch (e) {
      setNotice(`导入失败: ${String(e)}`)
    }
  }

  const publishAgent = async (id: string) => {
    try {
      await adminPublishAgent(id, { traffic: 100 })
      setNotice('Agent 已发布（100% 流量）')
    } catch (e) {
      setNotice(`发布失败: ${String(e)}`)
    }
  }

  return (
    <div className="admin-layout" data-testid="admin-agents">
      {/* 左侧：模板列表 */}
      <aside className="admin-side-list">
        <h4>Agent 模板</h4>
        {agents.map((a) => (
          <button
            key={a.id}
            className={a.id === selectedId ? 'list-item active' : 'list-item'}
            onClick={() => {
              setSelectedId(a.id)
              setNodes(a.graph?.nodes ?? DEFAULT_GRAPH)
              setEdges(a.graph?.edges ?? [])
            }}
          >
            <span>{a.name}</span>
            <small>{a.framework} · {a.enabled ? '在线' : '停用'}</small>
            <div className="admin-actions" style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button className="admin-btn sm ghost" onClick={e => { e.stopPropagation(); publishAgent(a.id) }}>发布</button>
              <button className="admin-btn sm ghost" onClick={e => { e.stopPropagation(); deleteAgent(a.id) }}>删</button>
            </div>
          </button>
        ))}
      </aside>

      {/* 右侧：详情 */}
      <section className="admin-detail">
        <h3>创建 Agent 模板</h3>
        <div className="admin-actions" style={{ marginBottom: 10 }}>
          <input
            placeholder="描述一个 Agent，如「帮我做个写周报的助手」"
            value={generateDesc}
            onChange={e => setGenerateDesc(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="btn-primary" onClick={generateAgent} disabled={aiBusy}>
            {aiBusy ? <span className="spin" /> : '✨ AI 生成'}
          </button>
          <button className="btn-primary" onClick={importAgent}>📥 导入</button>
        </div>
        {templates.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: 12 }}>
            <strong>模板市场：</strong>
            {templates.map(t => (
              <button
                key={t.name}
                className="admin-btn sm ghost"
                title={t.desc}
                onClick={() => {
                  setForm({ name: t.name, description: t.desc, system_prompt: t.desc || `You are a ${t.name} assistant.`, tools: '', framework: 'langgraph' })
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div className="form-grid">
          <label>
            名称
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            框架
            <select value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })}>
              {FRAMEWORKS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            描述
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="span-2">
            系统提示词
            <textarea
              rows={4}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            />
          </label>
          <label className="span-2">
            绑定工具（逗号分隔）
            <input value={form.tools} onChange={(e) => setForm({ ...form, tools: e.target.value })} />
          </label>
        </div>
        <div className="admin-actions">
          <button className="btn-primary" onClick={saveTemplate}>保存模板</button>
        </div>

        {selected && (
          <>
            <h3>流程图 · {selected.name}</h3>
            <div className="graph-canvas">
              {nodes.map((n) => (
                <div key={n.id} className={`graph-node kind-${n.kind}`}>
                  <strong>{n.label}</strong>
                  <small>{n.kind}</small>
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button onClick={addToolNode}>+ 添加工具节点</button>
              <button className="btn-primary" onClick={saveGraph}>保存流程图</button>
            </div>
            <p className="graph-edges">
              连接：{edges.map((e) => `${e.from} → ${e.to}`).join('，')}
            </p>
          </>
        )}
        {notice && <p className="admin-notice">{notice}</p>}
      </section>
    </div>
  )
}
