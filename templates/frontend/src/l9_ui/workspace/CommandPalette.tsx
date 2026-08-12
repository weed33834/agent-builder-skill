/**
 * CommandPalette — Ctrl/Cmd+K quick command palette (deep-spec 15 CommandPalette)
 * Fuzzy-search over workspaces / skills / notifications / nav, then execute.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Workspace, SkillItem, AppNotification } from '../../types'
import { listWorkspaces, listSkills, listNotifications } from '../../l8_api/api'

interface Cmd {
  group: string
  label: string
  icon: string
  hint?: string
  run: () => void
}

export function CommandPalette({
  onNavigate,
  open,
  onClose,
}: { onNavigate: (view: string) => void; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 10) }
  }, [open])

  useEffect(() => {
    if (!open) return
    listWorkspaces().then(r => setWorkspaces(r.items)).catch(() => {})
    listSkills().then(r => setSkills(r.items)).catch(() => {})
    listNotifications(true).then(r => setNotifs(r.items)).catch(() => {})
  }, [open])

  const cmds = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = [
      { group: '导航', label: '进入对话', icon: '💬', run: () => onNavigate('chat') },
      { group: '导航', label: '进入工作台', icon: '🗂️', run: () => onNavigate('workspace') },
      { group: '导航', label: '进入管理台', icon: '🛠️', run: () => onNavigate('admin') },
    ]
    const ws: Cmd[] = workspaces.map(w => ({
      group: '工作区', label: w.name, icon: '📁', hint: w.type,
      run: () => onNavigate('workspace'),
    }))
    const sk: Cmd[] = skills.slice(0, 10).map(s => ({
      group: '能力库', label: s.name, icon: s.kind === 'expert' ? '🧠' : s.kind === 'connector' ? '🔌' : '🧩', hint: s.kind,
      run: () => onNavigate('workspace'),
    }))
    const nf: Cmd[] = notifs.slice(0, 10).map(n => ({
      group: '通知', label: n.title, icon: '🔔', hint: n.module,
      run: () => onNavigate('workspace'),
    }))
    return [...nav, ...ws, ...sk, ...nf]
  }, [workspaces, skills, notifs, onNavigate])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return cmds
    return cmds.filter(c => (c.label + c.group + (c.hint || '')).toLowerCase().includes(s))
  }, [cmds, q])

  useEffect(() => { setActive(0) }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter') { filtered[active]?.run(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, active, onClose])

  if (!open) return null

  return (
    <div className="cmd-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmd-box">
        <input ref={inputRef} className="cmd-input" placeholder="搜索命令、工作区、能力、通知…"
          value={q} onChange={e => setQ(e.target.value)} />
        <div className="cmd-list">
          {filtered.map((c, i) => (
            <div key={c.group + c.label} className={`cmd-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)} onClick={() => { c.run(); onClose() }}>
              <span className="cmd-icon">{c.icon}</span>
              <span style={{ flex: 1, fontSize: 13.5 }}>{c.label}</span>
              {c.hint && <span style={{ color: '#8a919c', fontSize: 11 }}>{c.hint}</span>}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#8a919c', fontSize: 12 }}>无匹配</div>}
        </div>
        <div className="cmd-hint">↑↓ 选择 · Enter 执行 · Esc 关闭</div>
      </div>
    </div>
  )
}
