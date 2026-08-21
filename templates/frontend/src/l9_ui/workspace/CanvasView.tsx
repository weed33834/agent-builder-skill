/**
 * CanvasView — agent composition canvas (deep-spec 15 CanvasView)
 * List canvases; render node/edge graph with an SVG edge layer + HTML nodes.
 */
import { useEffect, useState } from 'react'
import type { CanvasDoc } from '../../types'
import { listCanvases, getCanvas } from '../../l8_api/api'

const NODE_COLOR: Record<string, string> = {
  trigger: '#d0a62f', agent: '#1f7bc8', tool: '#7c5cd6', memory: '#2f9e5f', llm: '#5b6472', output: '#d64545',
}

export function CanvasView() {
  const [canvases, setCanvases] = useState<CanvasDoc[]>([])
  const [current, setCurrent] = useState<CanvasDoc | null>(null)

  const refresh = () => listCanvases().then(r => setCanvases(r.items)).catch(() => setCanvases([]))
  useEffect(() => { refresh() }, [])

  const open = async (id: string) => {
    const c = await getCanvas(id)
    setCurrent(c)
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div className="canvas-toolbar">
        <span className="workspace-pane-title">画布</span>
        <select className="btn sm" onChange={e => e.target.value && open(e.target.value)} value={current?.id || ''}>
          <option value="">选择画布…</option>
          {canvases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="canvas-viewport" style={{ position: 'relative', minHeight: 380 }}>
        {current ? (
          <CanvasGraph doc={current} />
        ) : (
          <div style={{ textAlign: 'center', color: '#8a919c', padding: 40, fontSize: 12 }}>选择上方画布查看编排</div>
        )}
      </div>
    </div>
  )
}

function CanvasGraph({ doc }: { doc: CanvasDoc }) {
  const nodes = doc.nodes || []
  const edges = doc.edges || []
  const maxX = Math.max(100, ...nodes.map(n => n.x)) + 200
  const maxY = Math.max(100, ...nodes.map(n => n.y)) + 80
  const pos = Object.fromEntries(nodes.map(n => [n.id, { x: n.x, y: n.y }]))
  return (
    <svg width={maxX} height={maxY} style={{ position: 'absolute', inset: 0 }}>
      {edges.map(e => {
        const s = pos[e.source], t = pos[e.target]
        if (!s || !t) return null
        const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2 - 10
        return (
          <g key={e.id}>
            <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#b7c4d4" strokeWidth={1.5} />
            <circle cx={mx} cy={my} r={2} fill="#1f7bc8" />
            {e.label && (
              <text x={mx} y={my - 6} fontSize={10} fill="#8a919c" textAnchor="middle">{e.label}</text>
            )}
          </g>
        )
      })}
      {nodes.map(n => (
        <g key={n.id}>
          <rect x={n.x - 60} y={n.y - 16} width={120} height={32} rx={9}
            fill="#fff" stroke={NODE_COLOR[n.type] || '#c9d4e0'} strokeWidth={1.5} />
          <text x={n.x} y={n.y - 1} fontSize={11.5} textAnchor="middle" fill="#3b4250" fontWeight={600}>{n.label}</text>
        </g>
      ))}
    </svg>
  )
}
