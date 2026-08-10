/**
 * 监控告警页面（M9.22 + M13.22）
 *
 * 布局：指标卡片 + 时序图 + 告警规则 CRUD。
 * - 实时指标（/api/admin/metrics）
 * - 告警规则：指标 + 条件 + 阈值 + 通知渠道（/api/admin/alerts）
 * 接口：/api/admin/metrics*（adminGetMetrics）+ /api/admin/alerts*（adminListAlerts / adminSaveAlert）
 */

import { useState } from 'react'
import {
  adminGetMetrics, adminListAlerts, adminSaveAlert, adminDeleteAlert,
  adminGetAlertHistory, adminListTraces, adminGetLogs, adminGetDrift,
  adminGetUsage, adminSetBudget, securityScan, getCircuitBreakers,
} from '../../l8_api/api'

interface AlertRule {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  channels: string[]
  enabled: boolean
}

interface HistoryEvent { ts: number; action?: string; message?: string; level?: string }
interface LogEntry { ts: number; level: string; message: string; service?: string }
interface TraceItem { id: string; ts: number; name?: string; spans?: unknown[] }

const METRIC_DEFS = [
  { key: 'requests', label: '请求数', unit: 'req' },
  { key: 'errors', label: '错误数', unit: '' },
  { key: 'latency_ms', label: '平均延迟', unit: 'ms' },
  { key: 'tokens', label: 'Token 用量', unit: '' },
]

export function MonitoringPanel() {
  const [tab, setTab] = useState<'alerts' | 'history' | 'traces' | 'logs' | 'drift' | 'cost' | 'security'>('alerts')
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [traces, setTraces] = useState<TraceItem[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [drift, setDrift] = useState<{ series: unknown[]; alerts: unknown[] }>({ series: [], alerts: [] })
  /* 成本计费 (23) */
  const [usage, setUsage] = useState<{ days: { date: string; requests: number; cost_usd: number }[]; by_model: { model: string; requests: number; cost_usd: number }[]; total_cost_usd: number; monthly_spent_usd: number; budget_left_usd: number; budget: { monthly_usd: number; enabled: boolean } } | null>(null)
  const [budget, setBudget] = useState(100)
  /* 安全 (27) */
  const [scanText, setScanText] = useState('')
  const [scanResult, setScanResult] = useState<{ blocked: boolean; redacted: string; injection: { severity: string; action: string; hits: { pattern: string }[] }; pii: { count: number } } | null>(null)
  const [breakers, setBreakers] = useState<{ key: string; state: string; failures: number }[]>([])
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
    } catch { /* 保持空态 */ }
    try {
      const res = await adminListAlerts()
      setAlerts(res.items as unknown as AlertRule[])
    } catch { setAlerts([]) }
  }
  const loadHistory = () => adminGetAlertHistory().then(r => setHistory((r.items as unknown as HistoryEvent[]) || [])).catch(() => {})
  const loadTraces = () => adminListTraces().then(r => setTraces((r.items as unknown as TraceItem[]) || [])).catch(() => {})
  const loadLogs = () => adminGetLogs().then(r => setLogs((r.items as unknown as LogEntry[]) || [])).catch(() => {})
  const loadDrift = () => adminGetDrift().then(setDrift).catch(() => {})
  const loadUsage = () => adminGetUsage(7).then(setUsage).catch(() => {})
  const loadBreakers = () => getCircuitBreakers().then(r => setBreakers((r.items as unknown as { key: string; state: string; failures: number }[]) || [])).catch(() => {})
  void refresh()
  void loadHistory()
  void loadTraces()
  void loadLogs()
  void loadDrift()
  void loadUsage()
  void loadBreakers()

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

      <div className="tabs" style={{ margin: '12px 0' }}>
        {(['alerts', 'history', 'traces', 'logs', 'drift', 'cost', 'security'] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'alerts' ? '告警规则' : t === 'history' ? '告警历史' : t === 'traces' ? 'Trace' : t === 'logs' ? '日志' : t === 'drift' ? '数据漂移' : t === 'cost' ? '成本计费' : '安全扫描'}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
      <>
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
      </>
      )}

      {tab === 'history' && (
        <div>
          <h3>告警触发历史</h3>
          <table className="admin-table">
            <thead><tr><th>时间</th><th>事件</th><th>级别</th></tr></thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className="mono">{h.ts ? new Date(h.ts * 1000).toLocaleString('zh-CN') : '—'}</td>
                  <td>{h.message || h.action || ''}</td>
                  <td>{(h.level as string) || '—'}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={3} className="admin-empty">暂无告警事件</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'traces' && (
        <div>
          <h3>Trace 链路</h3>
          <table className="admin-table">
            <thead><tr><th>Trace ID</th><th>时间</th><th>名称</th></tr></thead>
            <tbody>
              {traces.map(t => (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td className="mono">{new Date(t.ts).toLocaleString('zh-CN')}</td>
                  <td>{t.name || '—'}</td>
                </tr>
              ))}
              {traces.length === 0 && <tr><td colSpan={3} className="admin-empty">暂无 Trace（请求产生后自动记录）</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div>
          <h3>结构化日志</h3>
          <table className="admin-table">
            <thead><tr><th>时间</th><th>级别</th><th>消息</th></tr></thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i}>
                  <td className="mono">{l.ts ? new Date(l.ts).toLocaleString('zh-CN') : '—'}</td>
                  <td><span className={`admin-badge ${l.level?.toLowerCase() === 'error' ? 'red' : l.level?.toLowerCase() === 'warning' ? 'amber' : 'green'}`}>{l.level}</span></td>
                  <td>{l.message}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={3} className="admin-empty">暂无日志</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'drift' && (
        <div>
          <h3>数据漂移检测</h3>
          {drift.alerts && drift.alerts.length > 0 && (
            <div className="admin-notice error">检测到 {drift.alerts.length} 个漂移预警</div>
          )}
          <div className="admin-json">{JSON.stringify(drift, null, 2)}</div>
        </div>
      )}

      {tab === 'cost' && (
        <div>
          <h3>成本计费（近 7 天，真实用量）</h3>
          <div className="stat-cards">
            <div className="stat-card"><strong>${usage?.total_cost_usd?.toFixed(4) ?? '0'}</strong><span>本周期总成本</span></div>
            <div className="stat-card"><strong>${usage?.monthly_spent_usd?.toFixed(2) ?? '0'}</strong><span>本月已用</span></div>
            <div className="stat-card"><strong>${usage?.budget_left_usd?.toFixed(2) ?? '0'}</strong><span>预算剩余</span></div>
          </div>
          <div className="form-grid">
            <label>月度预算（USD）
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} />
                <button className="btn-primary" onClick={async () => { await adminSetBudget({ monthly_usd: budget, enabled: true }); void loadUsage() }}>保存预算</button>
              </div>
            </label>
          </div>
          {usage?.by_model && usage.by_model.length > 0 && (
            <table className="admin-table">
              <thead><tr><th>模型</th><th>请求数</th><th>成本(USD)</th></tr></thead>
              <tbody>
                {usage.by_model.map(m => (
                  <tr key={m.model}><td className="mono">{m.model}</td><td>{m.requests}</td><td>${m.cost_usd.toFixed(4)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {usage && usage.days.length === 0 && <p className="admin-empty">暂无用量记录（对话完成后自动计费）</p>}
        </div>
      )}

      {tab === 'security' && (
        <div>
          <h3>AI 安全扫描（注入检测 / PII / 内容）</h3>
          <div className="form-grid">
            <label className="span-2">输入待扫描文本
              <textarea rows={3} value={scanText} onChange={e => setScanText(e.target.value)} placeholder="粘贴对话输入，检测 prompt 注入 / 泄露系统提示词 / 危险词…" />
            </label>
          </div>
          <div className="admin-actions">
            <button className="btn-primary" onClick={async () => {
              if (!scanText) return
              setScanResult(await securityScan(scanText))
            }}>扫描</button>
          </div>
          {scanResult && (
            <div>
              <div className={`admin-note ${scanResult.blocked ? 'error' : 'success'}`}>
                {scanResult.blocked ? '✗ 已拦截' : '✓ 通过'} · 注入级别 {scanResult.injection.severity} · 处置 {scanResult.injection.action}
                {scanResult.injection.hits.map((h, i) => <span key={i} className="admin-tag" style={{ marginLeft: 6 }}>{h.pattern}</span>)}
              </div>
              {scanResult.pii.count > 0 && <div className="admin-note">检测到 {scanResult.pii.count} 处 PII，脱敏后：<code>{scanResult.redacted}</code></div>}
            </div>
          )}
          <h3 style={{ marginTop: 16 }}>熔断器状态（性能工程 25）</h3>
          <table className="admin-table">
            <thead><tr><th>依赖</th><th>状态</th><th>连续失败</th></tr></thead>
            <tbody>
              {breakers.map(b => (
                <tr key={b.key}><td className="mono">{b.key}</td><td><span className={`admin-badge ${b.state === 'CLOSED' ? 'green' : b.state === 'OPEN' ? 'red' : 'amber'}`}>{b.state}</span></td><td>{b.failures}</td></tr>
              ))}
              {breakers.length === 0 && <tr><td colSpan={3} className="admin-empty">暂无熔断器实例（请求失败后自动创建）</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
