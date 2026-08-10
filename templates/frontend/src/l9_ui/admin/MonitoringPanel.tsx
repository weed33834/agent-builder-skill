/**
 * 监控告警页面（M9.22 + M13.22）
 *
 * 布局：指标卡片 + 时序图 + 告警规则 CRUD。
 * - 实时指标（/api/admin/metrics）
 * - 告警规则：指标 + 条件 + 阈值 + 通知渠道（/api/admin/alerts）
 * 接口：/api/admin/metrics*（adminGetMetrics）+ /api/admin/alerts*（adminListAlerts / adminSaveAlert）
 */

import { useState } from 'react'
import { adminGetMetrics, adminListAlerts, adminSaveAlert, adminDeleteAlert } from '../../l8_api/api'

interface AlertRule {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  channels: string[]
  enabled: boolean
}

const METRIC_DEFS = [
  { key: 'requests', label: '请求数', unit: 'req' },
  { key: 'errors', label: '错误数', unit: '' },
  { key: 'latency_ms', label: '平均延迟', unit: 'ms' },
  { key: 'tokens', label: 'Token 用量', unit: '' },
]

export function MonitoringPanel() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [form, setForm] = useState({
    name: '',
    metric: 'latency_ms',
    condition: '>',
    threshold: 1000,
    channels: 'log,webhook',
  })
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    try {
      const res = await adminGetMetrics()
      setSummary((res.summary as Record<string, number>) ?? {})
    } catch {
      /* 保持空态 */
    }
    try {
      const res = await adminListAlerts()
      setAlerts(res.items as unknown as AlertRule[])
    } catch {
      setAlerts([])
    }
  }
  void refresh()

  const saveAlert = async () => {
    if (!form.name) return
    try {
      await adminSaveAlert({
        name: form.name,
        metric: form.metric,
        condition: form.condition,
        threshold: Number(form.threshold),
        channels: form.channels.split(',').map((s) => s.trim()).filter(Boolean),
      })
      setNotice(`告警规则「${form.name}」已保存`)
      setForm({ name: '', metric: 'latency_ms', condition: '>', threshold: 1000, channels: 'log,webhook' })
      void refresh()
    } catch (e) {
      setNotice(`保存失败: ${String(e)}`)
    }
  }

  const deleteAlert = async (id: string) => {
    try {
      await adminDeleteAlert(id)
      setNotice('告警规则已删除')
      void refresh()
    } catch (e) {
      setNotice(`删除失败: ${String(e)}`)
    }
  }

  return (
    <div className="admin-panel" data-testid="admin-monitoring">
      <div className="stat-cards">
        {METRIC_DEFS.map((m) => (
          <div key={m.key} className="stat-card">
            <strong>{(summary[m.key] ?? 0).toLocaleString()}{m.unit}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      <h3>告警规则</h3>
      <div className="form-grid">
        <label>
          规则名称
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          指标
          <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
            {METRIC_DEFS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
        <label>
          条件
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            {['>', '>=', '<', '<=', '=='].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          阈值
          <input
            type="number"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
          />
        </label>
        <label className="span-2">
          通知渠道（逗号分隔：log / webhook / email）
          <input value={form.channels} onChange={(e) => setForm({ ...form, channels: e.target.value })} />
        </label>
      </div>
      <div className="admin-actions">
        <button className="btn-primary" onClick={saveAlert}>保存规则</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>名称</th><th>条件</th><th>阈值</th><th>渠道</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.metric} {a.condition} {a.threshold}</td>
              <td>{a.threshold}</td>
              <td>{(a.channels ?? []).join(', ')}</td>
              <td>{a.enabled ? '启用' : '停用'}</td>
              <td>
                <button className="admin-btn sm ghost" onClick={() => deleteAlert(a.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {notice && <p className="admin-notice">{notice}</p>}
    </div>
  )
}
