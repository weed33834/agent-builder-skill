/**
 * MemoryPanel — memory / knowledge-base browser (deep-spec 05 4.1)
 * List KBs, run retrieval query, show hits. Reuses /api/admin/memory/kbs + query.
 */
import { useEffect, useState } from 'react'
import { listMemoryKBs, adminQueryMemory } from '../../l8_api/api'

interface KB { id: string; name: string; doc_count: number; chunk_count: number; embedding: string }
interface Hit { chunk_id: string; score: number; snippet: string; source: string }

export function MemoryPanel() {
  const [kbs, setKbs] = useState<KB[]>([])
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [searching, setSearching] = useState(false)

  const refresh = () => listMemoryKBs().then(r => {
    const items = (r.items as unknown as KB[]) || []
    setKbs(items)
    if (items.length && !selected) setSelected(items[0].id)
  }).catch(() => setKbs([]))
  useEffect(() => { refresh() }, [])

  const search = async () => {
    if (!selected || !query.trim()) return
    setSearching(true)
    try {
      const r = await adminQueryMemory({ kb_id: selected, query: query.trim(), top_k: 5 })
      setHits(r.hits || [])
    } catch { setHits([]) } finally { setSearching(false) }
  }

  return (
    <div>
      <div className="mem-query">
        <input placeholder="记忆检索：输入查询…" value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <select className="btn" value={selected} onChange={e => setSelected(e.target.value)}>
          {kbs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <button className="btn primary sm" onClick={search} disabled={searching}>检索</button>
      </div>
      <div>
        {kbs.map(k => (
          <div className="mem-item" key={k.id} onClick={() => setSelected(k.id)} style={k.id === selected ? { borderColor: '#1f7bc8' } : undefined}>
            <div className="mem-item-name">{k.name}</div>
            <div className="mem-item-meta">{k.doc_count} 文档 · {k.chunk_count} 分块 · {k.embedding}</div>
          </div>
        ))}
        {kbs.length === 0 && <div style={{ color: '#8a919c', fontSize: 12, textAlign: 'center', padding: 16 }}>无知识库</div>}
      </div>
      {hits.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #e6e8eb', paddingTop: 8 }}>
          <div className="workspace-pane-title" style={{ marginBottom: 6 }}>检索结果</div>
          {hits.map(h => (
            <div className="mem-hit" key={h.chunk_id}>
              <span><b>{h.source}</b> · 相似度 {h.score.toFixed(3)}</span>
              <div style={{ color: '#4a515c' }}>{h.snippet}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
