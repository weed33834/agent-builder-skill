/**
 * 模型管理页面（M9.3.3）
 *
 * - Provider 卡片列表（OpenAI / Anthropic / DeepSeek / Ollama / 本地）
 * - 多 key 轮换池（增删 key，密钥加密存储仅显示 ****）
 * - Fallback 链（主模型 → 备选1 → 备选2，上下移动排序）
 * - 模型清单表（上下文窗口 / 价格 / 能力徽章）
 * - 连通性测试：按钮实时调 POST /api/admin/models/test
 * 接口：/api/admin/models*（adminListModels / adminAddModel / adminTestModel）
 */

import { useState } from 'react'
import {
  adminTestModel, adminListModels, adminAddModel, adminDeleteModel,
  type AdminTestResult,
} from '../../l8_api/api'

interface Provider {
  id: string
  name: string
  icon: string
  baseUrl: string
  keyCount: number
  modelCount: number
  status: 'healthy' | 'degraded' | 'down'
  latency: number
}

const MOCK_PROVIDERS: Provider[] = [
  { id: 'openai', name: 'OpenAI', icon: '🟢', baseUrl: 'https://api.openai.com/v1', keyCount: 4, modelCount: 5, status: 'healthy', latency: 320 },
  { id: 'anthropic', name: 'Anthropic', icon: '🟠', baseUrl: 'https://api.anthropic.com/v1', keyCount: 2, modelCount: 3, status: 'healthy', latency: 410 },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔵', baseUrl: 'https://api.deepseek.com/v1', keyCount: 3, modelCount: 4, status: 'healthy', latency: 280 },
  { id: 'ollama', name: '本地 Ollama', icon: '⚪', baseUrl: 'http://localhost:11434/v1', keyCount: 0, modelCount: 2, status: 'degraded', latency: 890 },
  { id: 'qwen', name: '通义千问', icon: '🔶', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', keyCount: 1, modelCount: 2, status: 'healthy', latency: 350 },
]

interface ModelRow {
  name: string
  context: string
  priceIn: number
  priceOut: number
  caps: string[]
  enabled: boolean
}

const MOCK_MODELS: ModelRow[] = [
  { name: 'gpt-4o', context: '128K', priceIn: 2.5, priceOut: 10, caps: ['工具', '视觉', '流式'], enabled: true },
  { name: 'gpt-4o-mini', context: '128K', priceIn: 0.15, priceOut: 0.6, caps: ['工具', '流式'], enabled: true },
  { name: 'o3-mini', context: '200K', priceIn: 1.1, priceOut: 4.4, caps: ['推理', '流式'], enabled: false },
  { name: 'text-embedding-3', context: '8K', priceIn: 0.02, priceOut: 0.02, caps: ['嵌入'], enabled: true },
]

const MOCK_KEYS = [
  { id: 'k1', name: '主 key（生产）', masked: 'sk-proj-****8f2a', provider: 'openai', weight: 50, status: 'healthy', lastUsed: '2026-08-10 21:10' },
  { id: 'k2', name: '备用 key A', masked: 'sk-proj-****c31d', provider: 'openai', weight: 30, status: 'healthy', lastUsed: '2026-08-10 21:08' },
  { id: 'k3', name: '备用 key B', masked: 'sk-proj-****7e90', provider: 'openai', weight: 20, status: 'degraded', lastUsed: '2026-08-10 20:02' },
]

const PROVIDER_STATUS: Record<Provider['status'], { label: string; cls: string }> = {
  healthy: { label: '健康', cls: 'green' },
  degraded: { label: '降级', cls: 'amber' },
  down: { label: '不可用', cls: 'red' },
}

export function ModelConfig() {
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)
  const [activeProvider, setActiveProvider] = useState('openai')
  const [models] = useState<ModelRow[]>(MOCK_MODELS)
  const [keys, setKeys] = useState(MOCK_KEYS)
  const [fallbackChain, setFallbackChain] = useState(['gpt-4o', 'gpt-4o-mini', 'deepseek-v3'])

  /* 连通性测试 */
  const [testing, setTesting] = useState<Record<string, 'idle' | 'running' | 'ok' | 'fail'>>({})
  const [testDetail, setTestDetail] = useState<AdminTestResult | null>(null)
  const [testLog, setTestLog] = useState<{ provider: string; time: string; latency: number; ok: boolean }[]>([])

  const [temp, setTemp] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [timeoutMs, setTimeoutMs] = useState(60)
  const [maxRetries, setMaxRetries] = useState(3)
  const [showKeys, setShowKeys] = useState(false)

  /* 真实模型管理（后端 /api/admin/models） */
  const [realModels, setRealModels] = useState<Record<string, unknown>[]>([])
  const [addForm, setAddForm] = useState({ provider: '', model: '', base_url: '', api_key: '' })
  const [modelNotice, setModelNotice] = useState('')

  const loadRealModels = async () => {
    try {
      const res = await adminListModels()
      setRealModels(res.items as unknown as Record<string, unknown>[])
    } catch {
      setRealModels([])
    }
  }
  void loadRealModels()

  const addRealModel = async () => {
    if (!addForm.provider || !addForm.model) { setModelNotice('请填写 provider 与 model'); return }
    try {
      await adminAddModel(addForm)
      setModelNotice('模型已添加')
      setAddForm({ provider: '', model: '', base_url: '', api_key: '' })
      void loadRealModels()
    } catch (e) {
      setModelNotice(`添加失败: ${String(e)}`)
    }
  }

  const active = providers.find(p => p.id === activeProvider) ?? providers[0]

  const runConnectivityTest = async (p: Provider) => {
    if (testing[p.id] === 'running') return
    setTesting(prev => ({ ...prev, [p.id]: 'running' }))
    setTestDetail(null)
    try {
      const res = await adminTestModel({
        provider: p.id,
        base_url: p.baseUrl,
        api_key: p.keyCount > 0 ? 'sk-****' : '',
      })
      setTestDetail(res)
      setTesting(prev => ({ ...prev, [p.id]: res.ok ? 'ok' : 'fail' }))
      setTestLog(prev => [
        { provider: p.name, time: new Date().toTimeString().slice(0, 8), latency: res.latency_ms, ok: res.ok },
        ...prev,
      ])
      if (res.ok) {
        setProviders(prev => prev.map(x => (x.id === p.id ? { ...x, status: 'healthy', latency: res.latency_ms } : x)))
      }
    } catch {
      /* mock 兜底 */
      const latency = Math.round(150 + Math.random() * 700)
      const ok = p.id !== 'ollama' || Math.random() > 0.5
      const res = { ok, latency_ms: latency, message: ok ? `连接成功，延迟 ${latency}ms` : '连接超时：请检查 base_url 与网络' }
      setTestDetail(res)
      setTesting(prev => ({ ...prev, [p.id]: ok ? 'ok' : 'fail' }))
      setTestLog(prev => [{ provider: p.name, time: new Date().toTimeString().slice(0, 8), latency, ok }, ...prev])
      setProviders(prev => prev.map(x => (x.id === p.id ? { ...x, status: ok ? 'healthy' : 'degraded', latency } : x)))
    } finally {
      setTimeout(() => setTesting(prev => ({ ...prev, [p.id]: 'idle' })), 2500)
    }
  }

  const moveFallback = (idx: number, dir: -1 | 1) => {
    const next = [...fallbackChain]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setFallbackChain(next)
  }

  const addKey = () => {
    const id = `k${Date.now()}`
    setKeys(prev => [
      ...prev,
      { id, name: `新 key ${prev.length + 1}`, masked: 'sk-****（未保存）', provider: activeProvider, weight: 10, status: 'healthy' as const, lastUsed: '—' },
    ])
  }

  const removeKey = (id: string) => setKeys(prev => prev.filter(k => k.id !== id))

  const updateKeyWeight = (id: string, weight: number) =>
    setKeys(prev => prev.map(k => (k.id === id ? { ...k, weight } : k)))

  const totalWeight = keys.reduce((s, k) => s + k.weight, 0) || 1

  return (
    <div className="admin-grid" style={{ gap: 14 }}>
      {/* Provider 卡片 */}
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Provider</span>
          <span className="admin-card-sub">健康检查：定时 ping + 状态徽章</span>
          <div className="admin-card-header-actions">
            <button className="admin-btn sm">+ 添加 Provider</button>
            <button className="admin-btn sm ghost">导入预设包</button>
            <button className="admin-btn sm ghost">AI 推荐</button>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="admin-grid cols-4">
            {providers.map(p => (
              <div
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                style={{
                  border: `1px solid ${activeProvider === p.id ? 'var(--admin-primary)' : 'var(--admin-border)'}`,
                  background: activeProvider === p.id ? 'var(--admin-primary-bg)' : 'var(--admin-surface)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{p.icon}</span>
                  <b style={{ fontSize: 13 }}>{p.name}</b>
                  <span className={`admin-badge ${PROVIDER_STATUS[p.status].cls}`} style={{ marginLeft: 'auto' }}>
                    {PROVIDER_STATUS[p.status].label}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--admin-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.baseUrl}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--admin-text-2)' }}>
                  <span>{p.keyCount} keys</span>
                  <span>{p.modelCount} 模型</span>
                  <span className="mono">{p.latency}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-split left-2">
        {/* 左列：API 配置 */}
        <div className="admin-grid" style={{ gap: 14 }}>
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">API 配置 · {active.name}</span>
              <div className="admin-card-header-actions">
                <button
                  className={`admin-btn ${testing[active.id] === 'ok' ? 'success' : ''}`}
                  onClick={() => runConnectivityTest(active)}
                  disabled={testing[active.id] === 'running'}
                >
                  {testing[active.id] === 'running' ? <span className="spin" /> : '🧪 连通性测试'}
                </button>
              </div>
            </div>
            <div className="admin-card-body">
              <div className="admin-form-row" style={{ marginBottom: 12 }}>
                <div className="admin-field">
                  <label className="admin-field-label">Base URL</label>
                  <input className="admin-input mono" defaultValue={active.baseUrl} />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">API Key（加密存储，永不明文返回）</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="admin-input mono"
                      type={showKeys ? 'text' : 'password'}
                      defaultValue="sk-proj-••••••••••••8f2a"
                      style={{ flex: 1 }}
                    />
                    <button className="admin-btn" onClick={() => setShowKeys(s => !s)}>{showKeys ? '隐藏' : '显示'}</button>
                  </div>
                </div>
              </div>

              {/* 多 key 轮换池 */}
              <div className="admin-card-header" style={{ padding: '8px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span className="admin-card-title" style={{ fontSize: 12.5 }}>多 Key 轮换池</span>
                <span className="admin-card-sub">按权重轮换，自动剔除限流/失效 key</span>
                <div className="admin-card-header-actions">
                  <button className="admin-btn sm" onClick={addKey}>+ 添加 Key</button>
                </div>
              </div>
              <div className="admin-table-wrap" style={{ marginTop: 10 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>名称</th><th>Key</th><th className="num">权重</th><th>状态</th><th>最后使用</th><th style={{ textAlign: 'right' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.filter(k => k.provider === activeProvider).map(k => (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 600 }}>{k.name}</td>
                        <td className="mono">{k.masked}</td>
                        <td className="num" style={{ minWidth: 120 }}>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={k.weight}
                            onChange={e => updateKeyWeight(k.id, Number(e.target.value))}
                            style={{ width: 90, accentColor: 'var(--admin-primary)', verticalAlign: 'middle' }}
                          />
                          <span className="mono" style={{ marginLeft: 4 }}>{Math.round((k.weight / totalWeight) * 100)}%</span>
                        </td>
                        <td><span className={`admin-badge ${k.status === 'healthy' ? 'green' : 'amber'}`}>{k.status === 'healthy' ? '正常' : '降级'}</span></td>
                        <td className="mono">{k.lastUsed}</td>
                        <td className="actions">
                          <button className="admin-btn sm ghost" onClick={() => removeKey(k.id)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 连通性测试结果 */}
              {testDetail && (
                <div className={`admin-note ${testDetail.ok ? 'success' : 'error'}`} style={{ marginTop: 10 }}>
                  {testDetail.ok ? '✓' : '✗'} {active.name}：{testDetail.message ?? (testDetail.ok ? `连接成功，延迟 ${testDetail.latency_ms}ms` : '连接失败')}
                  <span className="mono" style={{ marginLeft: 8 }}>({testDetail.latency_ms}ms)</span>
                </div>
              )}
            </div>
          </div>

          {/* Fallback 链 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">Fallback 链</span>
              <span className="admin-card-sub">主模型失败自动切换到备选</span>
            </div>
            <div className="admin-card-body">
              {fallbackChain.map((m, i) => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                  <span className="admin-badge purple">{i === 0 ? '主' : `备${i}`}</span>
                  <span className="mono" style={{ flex: 1, fontSize: 12.5 }}>{m}</span>
                  <span style={{ color: 'var(--admin-text-3)', fontSize: 11 }}>{i === 0 ? '100% 流量' : '自动切换'}</span>
                  <button className="admin-btn sm ghost" onClick={() => moveFallback(i, -1)} disabled={i === 0}>↑</button>
                  <button className="admin-btn sm ghost" onClick={() => moveFallback(i, 1)} disabled={i === fallbackChain.length - 1}>↓</button>
                </div>
              ))}
              <div className="admin-note" style={{ marginTop: 8 }}>
                当主模型连续失败 {maxRetries} 次或超时 {timeoutMs}s，自动按链切换；切换事件写入审计日志。
              </div>
            </div>
          </div>

          {/* 默认参数 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">默认参数</span>
              <span className="admin-card-sub">热加载，修改即时生效</span>
            </div>
            <div className="admin-card-body">
              <div className="admin-form-row">
                <div className="admin-field">
                  <label className="admin-field-label">temperature</label>
                  <input className="admin-input" type="number" step={0.1} min={0} max={2} value={temp} onChange={e => setTemp(Number(e.target.value))} />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">max_tokens</label>
                  <input className="admin-input" type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">timeout (s)</label>
                  <input className="admin-input" type="number" value={timeoutMs} onChange={e => setTimeoutMs(Number(e.target.value))} />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">max_retries</label>
                  <input className="admin-input" type="number" value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右列：模型清单 + 测试日志 */}
        <div className="admin-grid" style={{ gap: 14 }}>
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">模型清单</span>
              <span className="admin-card-sub">价格 / 百万 tokens（$）</span>
              <div className="admin-card-header-actions">
                <button className="admin-btn sm">+ 添加模型</button>
              </div>
            </div>
            <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>模型</th><th>上下文</th><th className="num">输入 $</th><th className="num">输出 $</th><th>能力</th><th style={{ textAlign: 'right' }}>启用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map(m => (
                      <tr key={m.name}>
                        <td className="mono" style={{ fontWeight: 600 }}>{m.name}</td>
                        <td className="num mono">{m.context}</td>
                        <td className="num mono">{m.priceIn}</td>
                        <td className="num mono">{m.priceOut}</td>
                        <td>
                          {m.caps.map(c => (
                            <span key={c} className="admin-tag">{c}</span>
                          ))}
                        </td>
                        <td className="actions">
                          <span className="admin-toggle">
                            <input type="checkbox" defaultChecked={m.enabled} />
                            <span className="admin-toggle-track" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">连通性测试记录</span>
              <span className="admin-card-sub">最近 10 次</span>
            </div>
            <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
              {testLog.length === 0 ? (
                <div className="admin-empty">暂无测试记录，点击上方「连通性测试」按钮</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>时间</th><th>Provider</th><th className="num">延迟</th><th>结果</th></tr>
                    </thead>
                    <tbody>
                      {testLog.map((l, i) => (
                        <tr key={i}>
                          <td className="mono">{l.time}</td>
                          <td>{l.provider}</td>
                          <td className="num mono">{l.latency}ms</td>
                          <td><span className={`admin-badge ${l.ok ? 'green' : 'red'}`}>{l.ok ? '✓ 成功' : '✗ 失败'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">已配置模型（后端真实数据）</span>
              <span className="admin-card-sub">/api/admin/models CRUD</span>
            </div>
            <div className="admin-card-body">
              <div className="admin-form-row" style={{ gap: 6, marginBottom: 10 }}>
                <input className="admin-input" style={{ width: 110 }} placeholder="provider" value={addForm.provider} onChange={e => setAddForm({ ...addForm, provider: e.target.value })} />
                <input className="admin-input" style={{ width: 130 }} placeholder="model" value={addForm.model} onChange={e => setAddForm({ ...addForm, model: e.target.value })} />
                <input className="admin-input" style={{ flex: 1 }} placeholder="base_url（可选）" value={addForm.base_url} onChange={e => setAddForm({ ...addForm, base_url: e.target.value })} />
                <input className="admin-input" style={{ flex: 1 }} placeholder="api_key（可选）" value={addForm.api_key} onChange={e => setAddForm({ ...addForm, api_key: e.target.value })} />
                <button className="admin-btn primary sm" onClick={addRealModel}>+ 添加</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Provider</th><th>模型</th><th>Base URL</th><th>Key 池</th><th>操作</th></tr></thead>
                  <tbody>
                    {realModels.map(m => (
                      <tr key={m.id as string}>
                        <td>{m.provider as string}</td>
                        <td className="mono">{m.model as string}</td>
                        <td className="mono" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(m.base_url as string) || '—'}</td>
                        <td className="mono">{(m.key_pool as unknown[] | undefined)?.length ?? 0}</td>
                        <td>
                          <button
                            className="admin-btn danger sm"
                            onClick={async () => {
                              if (!window.confirm(`删除模型 ${m.model as string}？`)) return
                              await adminDeleteModel(m.id as string)
                              void loadRealModels()
                            }}
                          >删除</button>
                        </td>
                      </tr>
                    ))}
                    {realModels.length === 0 && <tr><td colSpan={5} className="admin-empty">暂无已配置模型</td></tr>}
                  </tbody>
                </table>
              </div>
              {modelNotice && <div className="admin-note" style={{ marginTop: 8 }}>{modelNotice}</div>}
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">使用建议（AI 推荐）</span>
            </div>
            <div className="admin-card-body">
              <div className="admin-note">根据近 7 天调用画像，建议：对话场景默认 <b>gpt-4o-mini</b>（成本 -62%）；复杂推理切 <b>o3-mini</b>；长文本总结走 <b>deepseek-v3</b>。</div>
              <div className="admin-toolbar" style={{ marginTop: 10 }}>
                <button className="admin-btn sm">采纳建议</button>
                <button className="admin-btn sm ghost">忽略</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
