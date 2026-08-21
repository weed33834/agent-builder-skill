/**
 * WorkspaceConsole — 工作台视图（deep-spec 15 / 16）
 * 组合：SkillSidebar(左) · TaskCard+CanvasView(中) · WorkspacePanel+MemoryPanel(右)
 * 顶部工具栏含 NotificationBell 与 CommandPalette 入口。
 */
import { useEffect, useState } from 'react'
import type { AgentTask } from '../../types'
import { listTasks } from '../../l8_api/api'
import { TaskCard } from './TaskCard'
import { WorkspacePanel } from './WorkspacePanel'
import { SkillSidebar } from './SkillSidebar'
import { NotificationBell } from './NotificationBell'
import { CommandPalette } from './CommandPalette'
import { CanvasView } from './CanvasView'
import { MemoryPanel } from './MemoryPanel'
import './workspace.css'

export function WorkspaceConsole({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)

  const refreshTasks = () => listTasks().then(r => setTasks(r.items)).catch(() => setTasks([]))
  useEffect(() => { refreshTasks() }, [])

  return (
    <div className="workspace-console">
      <div className="workspace-main">
        <div className="workspace-toolbar">
          <span className="workspace-toolbar-title">🗂️ 工作台</span>
          <span className="workspace-toolbar-sub">Agent 能力库 · 任务 · 编排 · 记忆</span>
          <span style={{ flex: 1 }} />
          <button className="btn sm" onClick={() => setPaletteOpen(true)} title="Ctrl/Cmd+K">⌘K 命令</button>
          <NotificationBell />
        </div>

        <div className="workspace-grid">
          {/* Left: ability library */}
          <div className="workspace-pane">
            <div className="workspace-pane-head"><span className="workspace-pane-title">能力库</span></div>
            <div className="workspace-pane-body"><SkillSidebar /></div>
          </div>

          {/* Center: tasks + canvas */}
          <div className="workspace-pane">
            <div className="workspace-pane-head"><span className="workspace-pane-title">任务</span>
              <button className="btn sm" onClick={refreshTasks}>⟳</button>
            </div>
            <div className="workspace-pane-body">
              {tasks.map(t => <TaskCard key={t.id} task={t} onChanged={refreshTasks} />)}
              {tasks.length === 0 && <div style={{ color: '#8a919c', fontSize: 12, textAlign: 'center', padding: 20 }}>暂无任务</div>}
            </div>
            <div className="workspace-pane-head" style={{ borderTop: '1px solid #f0f1f3' }}><span className="workspace-pane-title">编排画布</span></div>
            <div className="workspace-pane-body" style={{ display: 'flex' }}><CanvasView /></div>
          </div>

          {/* Right: workspaces + memory */}
          <div className="workspace-pane">
            <div className="workspace-pane-head"><span className="workspace-pane-title">工作区</span></div>
            <div className="workspace-pane-body"><WorkspacePanel /></div>
            <div className="workspace-pane-head" style={{ borderTop: '1px solid #f0f1f3' }}><span className="workspace-pane-title">记忆检索</span></div>
            <div className="workspace-pane-body"><MemoryPanel /></div>
          </div>
        </div>
      </div>

      <CommandPalette onNavigate={onNavigate} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
