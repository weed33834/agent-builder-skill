/**
 * TaskCard — task execution card (deep-spec 15 A6-6)
 * Shows progress, step logs, result, duration, retry & cancel.
 */
import { useState } from 'react'
import type { AgentTask } from '../../types'
import { retryTask, cancelTask, deleteTask } from '../../l8_api/api'

export function TaskCard({
  task,
  onChanged,
}: { task: AgentTask; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false)

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false); onChanged?.() }
  }

  const dur = task.started_at && task.finished_at
    ? Math.round((task.finished_at - task.started_at) * 1000) + 'ms'
    : task.started_at ? '进行中' : ''

  return (
    <div className="task-card">
      <div className="task-card-head">
        <span className={`task-status-dot ${task.status}`} />
        <span className="task-title">{task.title}</span>
        {dur && <span style={{ fontSize: 11, color: '#8a919c' }}>{dur}</span>}
      </div>
      <div className="task-progress">
        <div className="task-progress-fill" style={{ width: `${task.progress}%` }} />
      </div>
      {task.steps.length > 0 && (
        <ul className="task-steps">
          {task.steps.map((s, i) => (
            <li key={i} className={s.status}>
              <span>{s.name}</span>
              {s.detail && <span style={{ color: '#8a919c' }}>— {s.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      {task.result && <div style={{ fontSize: 11.5, color: '#2f9e5f', marginTop: 4 }}>✓ {task.result}</div>}
      {task.error && <div style={{ fontSize: 11.5, color: '#d64545', marginTop: 4 }}>✕ {task.error}</div>}
      <div className="task-actions">
        {(task.status === 'done' || task.status === 'failed' || task.status === 'cancelled') && (
          <button className="task-btn" disabled={busy} onClick={() => act(() => retryTask(task.id))}>重试</button>
        )}
        {task.status === 'running' && (
          <button className="task-btn" disabled={busy} onClick={() => act(() => cancelTask(task.id))}>取消</button>
        )}
        <button className="task-btn" disabled={busy} onClick={() => act(async () => { await deleteTask(task.id); })}>删除</button>
      </div>
    </div>
  )
}
