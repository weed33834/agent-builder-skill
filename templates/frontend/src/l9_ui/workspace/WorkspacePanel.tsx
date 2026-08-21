/**
 * WorkspacePanel — resource-isolated workspaces (deep-spec 16)
 * List / create / update / delete dept·project·personal workspaces.
 */
import { useEffect, useState } from 'react'
import type { Workspace } from '../../types'
import { listWorkspaces, createWorkspace } from '../../l8_api/api'

export function WorkspacePanel({ onSelect }: { onSelect?: (ws: Workspace) => void }) {
  const [items, setItems] = useState<Workspace[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<'dept' | 'project' | 'personal'>('project')

  const refresh = () => listWorkspaces().then(r => setItems(r.items)).catch(() => setItems([]))
  useEffect(() => { refresh() }, [])

  const create = async () => {
    if (!name.trim()) return
    await createWorkspace({ name: name.trim(), type, description: '新建工作区' })
    setName('')
    refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input className="mem-query" style={{ flex: 1 }} placeholder="工作区名称"
          value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
        <select className="btn" value={type} onChange={e => setType(e.target.value as typeof type)}>
          <option value="project">项目</option>
          <option value="dept">部门</option>
          <option value="personal">个人</option>
        </select>
        <button className="btn primary sm" onClick={create}>新建</button>
      </div>
      {items.map(ws => (
        <div className="ws-item" key={ws.id} onClick={() => onSelect?.(ws)}>
          <div className="ws-item-head">
            <span className="ws-type {ws.type}">{ws.type === 'project' ? '项目' : ws.type === 'dept' ? '部门' : '个人'}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{ws.name}</span>
          </div>
          <div className="ws-meta">{ws.description || ''} · 所有者 {ws.owner}</div>
          <div className="ws-resources">
            <span>🤖 {ws.resources?.agents ?? 0} Agent</span>
            <span>🧩 {ws.resources?.kbs ?? 0} 知识库</span>
            <span>💬 {ws.resources?.sessions ?? 0} 会话</span>
            <span>👥 {ws.members?.length ?? 0} 成员</span>
          </div>
        </div>
      ))}
      {items.length === 0 && <div style={{ color: '#8a919c', fontSize: 12, textAlign: 'center', padding: 20 }}>暂无工作区</div>}
    </div>
  )
}
