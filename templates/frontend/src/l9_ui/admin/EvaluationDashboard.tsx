/**
 * 评估管理页面（M10.22）
 *
 * 布局：评估数据集列表 + 用例编辑器 + 执行报告。
 * - 数据集 CRUD（adminSaveEvaluation / adminListEvaluations）
 * - 执行评估：数据集 + Agent 版本 → 跑分报告（adminRunEvaluation）
 * - 结果看板：通过率 / 各指标得分
 * 接口：/api/admin/evaluations*（adminListEvaluations / adminSaveEvaluation / adminRunEvaluation）
 */

import { useState } from 'react'
import { adminListEvaluations, adminRunEvaluation, adminSaveEvaluation } from '../../l8_api/api'

interface EvalCase {
  id: string
  name: string
  input: string
  expected: string
  passed?: boolean
  score?: number
}

interface Evaluation {
  id: string
  name: string
  cases: EvalCase[]
  tags: string[]
}

interface Report {
  dataset_id: string
  agent_version: string
  pass_threshold: number
  pass_rate?: number
  [k: string]: unknown
}

export function EvaluationDashboard() {
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [form, setForm] = useState({ name: '', input: '', expected: '', tags: '' })
  const [runConfig, setRunConfig] = useState({ dataset_id: '', agent_version: 'latest' })
  const [report, setReport] = useState<Report | null>(null)
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    try {
      const res = await adminListEvaluations()
      setEvals(res.items as unknown as Evaluation[])
    } catch {
      setEvals([])
    }
  }
  void refresh()

  const addCase = async () => {
    if (!form.name || !form.input) return
    const caseItem: EvalCase = {
      id: `c_${Date.now()}`,
      name: form.name,
      input: form.input,
      expected: form.expected,
    }
    await adminSaveEvaluation({
      name: form.name,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      cases: [caseItem],
    })
    setNotice(`用例「${form.name}」已加入数据集`)
    setForm({ name: '', input: '', expected: '', tags: '' })
    void refresh()
  }

  const run = async () => {
    if (!runConfig.dataset_id) return
    try {
      const res = await adminRunEvaluation({
        dataset_id: runConfig.dataset_id,
        agent_version: runConfig.agent_version,
        pass_threshold: 0.8,
      })
      setReport(res.report as Report)
      setNotice(`评估任务 ${res.task_id} 已创建 (${res.status})`)
    } catch (e) {
      setNotice(`执行失败: ${String(e)}`)
    }
  }

  const totalCases = evals.reduce((a, e) => a + (e.cases?.length ?? 0), 0)

  return (
    <div className="admin-panel" data-testid="admin-evaluations">
      <div className="stat-cards">
        <div className="stat-card"><strong>{evals.length}</strong><span>数据集</span></div>
        <div className="stat-card"><strong>{totalCases}</strong><span>用例</span></div>
        <div className="stat-card"><strong>{report?.pass_rate ?? '—'}</strong><span>最近通过率</span></div>
      </div>

      <h3>新增评估用例</h3>
      <div className="form-grid">
        <label>
          用例名称
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          标签
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="客服, 回归" />
        </label>
        <label className="span-2">
          输入
          <textarea rows={2} value={form.input} onChange={(e) => setForm({ ...form, input: e.target.value })} />
        </label>
        <label className="span-2">
          期望输出
          <textarea rows={2} value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value })} />
        </label>
      </div>
      <div className="admin-actions">
        <button className="btn-primary" onClick={addCase}>加入数据集</button>
      </div>

      <h3>数据集</h3>
      <table className="admin-table">
        <thead>
          <tr><th>数据集</th><th>用例数</th><th>标签</th></tr>
        </thead>
        <tbody>
          {evals.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.name}</td>
              <td>{ev.cases?.length ?? 0}</td>
              <td>{(ev.tags ?? []).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>执行评估</h3>
      <div className="admin-actions">
        <select value={runConfig.dataset_id} onChange={(e) => setRunConfig({ ...runConfig, dataset_id: e.target.value })}>
          <option value="">选择数据集…</option>
          {evals.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
        <input
          placeholder="Agent 版本"
          value={runConfig.agent_version}
          onChange={(e) => setRunConfig({ ...runConfig, agent_version: e.target.value })}
        />
        <button className="btn-primary" onClick={run}>运行评估</button>
      </div>
      {report && (
        <div className="report-card">
          <h4>评估报告</h4>
          <pre>{JSON.stringify(report, null, 2)}</pre>
        </div>
      )}
      {notice && <p className="admin-notice">{notice}</p>}
    </div>
  )
}
