/**
 * SandboxPanel — sandbox environment management (M3.5)
 * List / create / enable-disable / set-default envs + test-run code.
 */
import { useEffect, useState } from 'react'

interface SandboxEnv {
  id: string
  name: string
  language: string
  packages: string[]
  image: string
  quota: { timeout?: number; mem_mb?: number }
  type: string
  enabled: boolean
}

const API = '/api/sandbox'

export function SandboxPanel() {
  const [envs, setEnvs] = useState<SandboxEnv[]>([])
  const [defaultId, setDefaultId] = useState('')
  const [globalEnabled, setGlobalEnabled] = useState(true)
  const [envId, setEnvId] = useState('python')
  const [code, setCode] = useState('print(21 * 2)')
  const [lang, setLang] = useState('python')
  const [result, setResult] = useState<string>('')

  const refresh = async () => {
    try {
      const r = await fetch(`${API}/envs`).then(r => r.json())
      setEnvs(r.items || [])
      setDefaultId(r.default || '')
      setGlobalEnabled(r.enabled !== false)
    } catch { setEnvs([]) }
  }
  useEffect(() => { refresh() }, [])

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`${API}/envs/${id}/enable`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
    refresh()
  }
  const setDefault = async (id: string) => {
    await fetch(`${API}/default`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    refresh()
  }
  const toggleGlobal = async (enabled: boolean) => {
    await fetch(`${API}/enabled`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
    setGlobalEnabled(enabled)
  }
  const run = async () => {
    setResult('运行中…')
    const r = await fetch(`${API}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ env_id: envId, language: lang, code }) }).then(r => r.json())
    setResult(r.ok ? (r.output || '(无输出)') : `✕ ${r.error || 'failed'}`)
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={globalEnabled} onChange={e => toggleGlobal(e.target.checked)} readOnly />
          沙箱全局启用
        </label>
        <span style={{ fontSize: 12, color: '#8a919c' }}>默认沙箱：<b>{defaultId}</b></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
        {envs.map(e => (
          <div key={e.id} className="admin-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{e.name}</b>
              <span style={{ fontSize: 11, color: e.type === 'cloud' ? '#7c5cd6' : '#2f9e5f' }}>{e.type === 'cloud' ? '云端' : '本地'}</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#8a919c', margin: '4px 0' }}>{e.language} · {e.image || 'custom'}</div>
            <div style={{ fontSize: 11, color: '#5b6472' }}>{e.packages.length ? e.packages.slice(0, 4).join(' / ') : '无预装'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 11.5, display: 'flex', gap: 4 }}>
                <input type="checkbox" checked={e.enabled} onChange={ev => toggle(e.id, ev.target.checked)} readOnly />启用
              </label>
              {e.id !== defaultId && <button className="btn sm" onClick={() => setDefault(e.id)}>设为默认</button>}
              {e.id === defaultId && <span style={{ fontSize: 11, color: '#1f7bc8' }}>★默认</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: 16, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>测试运行（走所选沙箱）</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select className="btn" value={envId} onChange={e => setEnvId(e.target.value)}>
            {envs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="btn" value={lang} onChange={e => setLang(e.target.value)}>
            <option value="python">python</option><option value="node">node</option><option value="sh">sh</option>
          </select>
          <button className="btn primary" onClick={run}>运行</button>
        </div>
        <textarea className="mem-query" rows={3} style={{ width: '100%', fontFamily: 'monospace' }} value={code} onChange={e => setCode(e.target.value)} />
        <pre style={{ background: '#fafbfc', padding: 10, borderRadius: 8, fontSize: 12, minHeight: 40, whiteSpace: 'pre-wrap' }}>{result}</pre>
      </div>
    </div>
  )
}
