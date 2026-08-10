/**
 * 编排工作流管理页面（M7.25）
 *
 * 布局：工作流列表 + 节点/边编辑器（类流程图）+ 运行模式配置。
 * - 支持编排模式：顺序 / 并行 fanout / 条件路由 / supervisor / 分层
 * - 框架中立的运行后端：AgentRuntime 适配器（M0.21）
 * 接口：/api/admin/workflows*（adminListWorkflows / adminSaveWorkflow）
 */

import { useState } from 'react'
import {
  adminListWorkflows, adminSaveWorkflow, adminDeleteWorkflow,
  adminListA2A, adminRegisterA2A, adminDeleteA2A, adminListA2ATasks,
} from '../../l8_api/api'

interface Workflow {
  id: string
  name: string
  description: string
  mode: string
  framework: string
  enabled: boolean
  steps: string[]
  graph?: { nodes?: { label?: string }[] }
}

interface A2AAgent { id: string; name: string; url: string; status: string }
interface A2ATask { id: string; name?: string; status?: string }

const MODES = ['sequential', 'fanout', 'router', 'supervisor', 'hierarchical']

export function OrchestrationWorkflow() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [a2aAgents, setA2aAgents] = useState<A2AAgent[]>([])
  const [a2aTasks, setA2aTasks] = useState<A2ATask[]>([])
  const [a2aUrl, setA2aUrl] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    mode: 'sequential',
    framework: 'langgraph',
    steps: '',
  })
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    try {
      const res = await adminListWorkflows()
      setWorkflows(res.items as unknown as Workflow[])
    } catch {
      setWorkflows([])
    }
  }
  void refresh()

  const refreshA2A = async () => {
    try {
      const agents = await adminListA2A()
      setA2aAgents((agents.items as unknown as A2AAgent[]) || [])
      const tasks = await adminListA2ATasks()
      setA2aTasks((tasks.items as unknown as A2ATask[]) || [])
    } catch {
      setA2aAgents([]); setA2aTasks([])
    }
  }
  void refreshA2A()

  const save = async () => {
    if (!form.name) return
    try {
      await adminSaveWorkflow({
        name: form.name,
        description: form.description,
        framework: form.framework,
        graph: {
          nodes: form.steps.split(',').map((s, i) => ({ id: `n${i}`, label: s.trim() })),
          edges: [],
          mode: form.mode,
        },
      })
      setNotice(`工作流「${form.name}」已保存`)
      setForm({ name: '', description: '', mode: 'sequential', framework: 'langgraph', steps: '' })
      void refresh()
    } catch (e) {
      setNotice(`保存失败: ${String(e)}`)
    }
  }

  return (
    <div className="admin-panel" data-testid="admin-workflows">
      <h3>创建编排工作流</h3>
      <div className="form-grid">
        <label>
          名称
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          编排模式
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          运行框架
          <select value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })}>
            {['langgraph', 'openai-agents', 'claude-sdk', 'adk', 'autogen', 'bare'].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="span-2">
          描述
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="span-2">
          步骤（逗号分隔，按序编排）
          <input value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} placeholder="意图识别, 工具检索, 生成回复" />
        </label>
      </div>
      <div className="admin-actions">
        <button className="btn-primary" onClick={save}>保存工作流</button>
      </div>

      <h3>已有工作流</h3>
      <table className="admin-table">
        <thead>
          <tr><th>名称</th><th>模式</th><th>框架</th><th>步骤</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {workflows.map((w) => (
            <tr key={w.id}>
              <td>{w.name}</td>
              <td>{w.mode}</td>
              <td>{w.framework}</td>
              <td>{Array.isArray(w.steps) ? w.steps.join(' → ') : (w.graph as { nodes?: { label?: string }[] } | undefined)?.nodes?.map(n => n.label).join(' → ') ?? '—'}</td>
              <td>{w.enabled ? '在线' : '停用'}</td>
              <td>
                <button className="admin-btn danger sm" onClick={async () => { await adminDeleteWorkflow(w.id); void refresh() }}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>A2A 远端 Agent 注册表</h3>
      <div className="form-grid">
        <label className="span-2">
          Agent Card URL
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={a2aUrl} onChange={e => setA2aUrl(e.target.value)} placeholder="https://example.com/agent" style={{ flex: 1 }} />
            <button className="btn-primary" onClick={async () => {
              if (!a2aUrl.trim()) return
              await adminRegisterA2A({ url: a2aUrl.trim() })
              setA2aUrl('')
              void refreshA2A()
            }}>注册</button>
          </div>
        </label>
      </div>
      <table className="admin-table">
        <thead><tr><th>名称</th><th>URL</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {a2aAgents.map(a => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td className="mono">{a.url}</td>
              <td>{a.status}</td>
              <td><button className="admin-btn danger sm" onClick={async () => { await adminDeleteA2A(a.id); void refreshA2A() }}>删除</button></td>
            </tr>
          ))}
          {a2aAgents.length === 0 && <tr><td colSpan={4} className="admin-empty">暂无远端 Agent</td></tr>}
        </tbody>
      </table>

      <h3>任务监控（最近 {a2aTasks.length}）</h3>
      <table className="admin-table">
        <thead><tr><th>任务</th><th>状态</th></tr></thead>
        <tbody>
          {a2aTasks.map(t => (
            <tr key={t.id}><td className="mono">{t.name || t.id}</td><td>{t.status || '—'}</td></tr>
          ))}
          {a2aTasks.length === 0 && <tr><td colSpan={2} className="admin-empty">暂无任务</td></tr>}
        </tbody>
      </table>
      {notice && <p className="admin-notice">{notice}</p>}
    </div>
  )
}
