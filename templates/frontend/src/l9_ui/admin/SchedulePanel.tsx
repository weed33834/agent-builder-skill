/**
 * L9 - Schedule / Scheduled Tasks admin page (full-spec G11)
 *
 * Backs onto /api/admin/tasks (cron-based scheduled Agent workflows).
 */

import { useEffect, useState } from 'react'
import { adminListTasks, adminCreateTask, adminDeleteTask } from '../../l8_api/api'

interface TaskItem { id: string; name: string; cron: string; action: Record<string, unknown>; enabled: boolean; last_run?: string; created_at: number }

export function SchedulePanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [form, setForm] = useState({ name: '', cron: '0 9 * * *', action: '' })

  const load = () => adminListTasks().then(r => setTasks(r.items as unknown as TaskItem[])).catch(() => {})

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name) return
    let action: Record<string, unknown> = {}
    try { action = form.action ? JSON.parse(form.action) : {} } catch { action = { prompt: form.action } }
    await adminCreateTask({ name: form.name, cron: form.cron, action })
    setForm({ name: '', cron: '0 9 * * *', action: '' })
    load()
  }

  return (
    <div className="admin-stack">
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">定时任务</span>
          <span className="admin-card-sub">无人值守 · 重复性工作交由 Agent 定时代劳</span>
        </div>
        <div className="admin-card-body">
          <div className="admin-inline-form">
            <input placeholder="任务名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input title="Cron 表达式" value={form.cron} onChange={e => setForm({ ...form, cron: e.target.value })} style={{ width: 140 }} />
            <input placeholder='动作 JSON，如 {"prompt":"生成周报"}' value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} style={{ flex: 2 }} />
            <button className="admin-btn primary" onClick={create}>+ 新建任务</button>
          </div>
          <table className="admin-table">
            <thead><tr><th>名称</th><th>Cron</th><th>动作</th><th>状态</th><th>上次运行</th><th>操作</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td><code>{t.cron}</code></td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(t.action || {})}
                  </td>
                  <td>{t.enabled ? '启用' : '停用'}</td>
                  <td>{t.last_run || '—'}</td>
                  <td><button className="admin-btn danger sm" onClick={() => adminDeleteTask(t.id).then(load)}>删除</button></td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={6} className="admin-empty">暂无定时任务</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default SchedulePanel
