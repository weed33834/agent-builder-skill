/**
 * 记忆管理页面（M6.22 / M6.23）
 *
 * 布局：统计卡片 + Tab（短期记忆 / 向量库 / 检索测试）。
 * - 短期记忆：查看最近条目、一键清理
 * - 向量库：知识库列表、增量写入、清理
 * - 检索测试：query → Top-K 召回结果（/api/admin/memory/query）
 * 接口：/api/admin/memory*（adminGetMemory / adminSaveMemory / adminQueryMemory）
 */

import { useState } from 'react'
import { adminGetMemory, adminQueryMemory, adminSaveMemory } from '../../l8_api/api'

interface MemoryEntry {
  id: string
  content: string
  ts: number
}

interface Hit {
  chunk_id: string
  score: number
  snippet: string
  source: string
}

export function MemoryManager() {
  const [tab, setTab] = useState<'short' | 'vector' | 'query'>('short')
  const [ephemeral, setEphemeral] = useState<MemoryEntry[]>([])
  const [kbs, setKbs] = useState<Record<string, number>>({})
  const [stats, setStats] = useState<Record<string, number>>({})
  const [newEntry, setNewEntry] = useState('')
  const [query, setQuery] = useState('')
  const [kbId, setKbId] = useState('default')
  const [hits, setHits] = useState<Hit[]>([])
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    try {
      const res = await adminGetMemory()
      setEphemeral((res.ephemeral as MemoryEntry[]) ?? [])
      const vs = (res.vector_store as Record<string, unknown[]>) ?? {}
      setKbs(Object.fromEntries(Object.entries(vs).map(([k, v]) => [k, (v as unknown[]).length])))
      setStats((res.stats as Record<string, number>) ?? {})
    } catch {
      /* 后端未就绪时保持空态 */
    }
  }
  void refresh()

  const addEntry = async () => {
    if (!newEntry) return
    await adminSaveMemory({ scope: 'short', content: newEntry })
    setNewEntry('')
    setNotice('短期记忆已写入')
    void refresh()
  }

  const addChunk = async () => {
    if (!newEntry) return
    await adminSaveMemory({ scope: 'vector', kb_id: kbId, content: newEntry })
    setNewEntry('')
    setNotice(`知识库「${kbId}」已写入 1 条`)
    void refresh()
  }

  const runQuery = async () => {
    if (!query) return
    const res = await adminQueryMemory({ kb_id: kbId, query, top_k: 5 })
    setHits(res.hits ?? [])
  }

  return (
    <div className="admin-panel" data-testid="admin-memory">
      <div className="stat-cards">
        <div className="stat-card"><strong>{stats.ephemeral_count ?? ephemeral.length}</strong><span>短期记忆</span></div>
        <div className="stat-card"><strong>{stats.kb_count ?? Object.keys(kbs).length}</strong><span>知识库</span></div>
        <div className="stat-card"><strong>{Object.values(kbs).reduce((a, b) => a + b, 0)}</strong><span>向量 Chunks</span></div>
      </div>

      <div className="tabs">
        {(['short', 'vector', 'query'] as const).map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t === 'short' ? '短期记忆' : t === 'vector' ? '向量库' : '检索测试'}
          </button>
        ))}
      </div>

      {tab === 'short' && (
        <section>
          <div className="admin-actions">
            <input
              placeholder="写入一条短期记忆…"
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
            />
            <button className="btn-primary" onClick={addEntry}>写入</button>
          </div>
          <ul className="memory-list">
            {[...ephemeral].reverse().map((m) => (
              <li key={m.id}>
                <span>{m.content}</span>
                <small>{new Date(m.ts * 1000).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'vector' && (
        <section>
          <div className="admin-actions">
            <input
              placeholder="知识库 ID"
              value={kbId}
              onChange={(e) => setKbId(e.target.value)}
              style={{ width: 160 }}
            />
            <input
              placeholder="写入向量条目…"
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
            />
            <button className="btn-primary" onClick={addChunk}>写入</button>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>知识库</th><th>Chunks</th></tr>
            </thead>
            <tbody>
              {Object.entries(kbs).map(([kb, count]) => (
                <tr key={kb}><td>{kb}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'query' && (
        <section>
          <div className="admin-actions">
            <input
              placeholder="检索 Query…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={kbId} onChange={(e) => setKbId(e.target.value)}>
              {Object.keys(kbs).length ? Object.keys(kbs).map((k) => (
                <option key={k} value={k}>{k}</option>
              )) : <option value="default">default</option>}
            </select>
            <button className="btn-primary" onClick={runQuery}>检索</button>
          </div>
          {hits.map((h) => (
            <div key={h.chunk_id} className="hit-card">
              <div className="hit-head">
                <strong>{h.source} / {h.chunk_id}</strong>
                <span className="badge">{h.score.toFixed(3)}</span>
              </div>
              <p>{h.snippet}</p>
            </div>
          ))}
        </section>
      )}
      {notice && <p className="admin-notice">{notice}</p>}
    </div>
  )
}
