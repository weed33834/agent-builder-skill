/**
 * 工具管理页面（M9.4.5）
 *
 * - 统计面板：工具总数 / 启用 / MCP 服务 / 今日调用
 * - 工具列表（内置 / 自定义 / MCP 分组）：启用停用开关、参数配置
 * - Schema 可视化：JSON Schema → 参数表（必填/类型/枚举/默认值）
 * - MCP 连接向导：传输方式 + 命令/URL + JSON 配置 + 测试连接
 * - 试跑面板：填参数执行，展示结果 + 耗时 + 审计
 * 接口：/api/admin/tools*（adminListTools / adminRegisterTool / adminTestMCP）
 */

import { useState } from 'react'
import { adminTestMCP } from '../../l8_api/api'

interface ToolDef {
  id: string
  name: string
  group: 'builtin' | 'custom' | 'mcp'
  desc: string
  enabled: boolean
  danger: 'read' | 'write' | 'shell'
  calls: number
  failRate: number
  timeout: number
  schema: { name: string; type: string; required: boolean; enum?: string[]; def: string }[]
}

const MOCK_TOOLS: ToolDef[] = [
  {
    id: 't1', name: 'web_search', group: 'builtin', desc: '联网搜索，返回标题+摘要+链接', enabled: true, danger: 'read',
    calls: 12840, failRate: 0.4, timeout: 8,
    schema: [
      { name: 'query', type: 'string', required: true, def: '' },
      { name: 'count', type: 'integer', required: false, def: '10' },
      { name: 'region', type: 'string', required: false, enum: ['us-en', 'uk-en', 'de-de'], def: 'us-en' },
    ],
  },
  {
    id: 't2', name: 'sales_query', group: 'custom', desc: '查询公司销售数据（BI 接口）', enabled: true, danger: 'read',
    calls: 3204, failRate: 0.8, timeout: 15,
    schema: [
      { name: 'dimension', type: 'string', required: true, enum: ['product', 'region', 'channel'], def: '' },
      { name: 'from', type: 'string', required: true, def: '2026-08-01' },
      { name: 'to', type: 'string', required: true, def: '2026-08-10' },
      { name: 'granularity', type: 'string', required: false, enum: ['day', 'week', 'month'], def: 'day' },
    ],
  },
  {
    id: 't3', name: 'file_write', group: 'custom', desc: '写入项目文件（路径白名单限定）', enabled: true, danger: 'write',
    calls: 486, failRate: 1.2, timeout: 5,
    schema: [
      { name: 'path', type: 'string', required: true, def: '' },
      { name: 'content', type: 'string', required: true, def: '' },
    ],
  },
  {
    id: 't4', name: 'exec_shell', group: 'custom', desc: '执行 shell 命令（高危）', enabled: false, danger: 'shell',
    calls: 96, failRate: 3.1, timeout: 30,
    schema: [
      { name: 'command', type: 'string', required: true, def: '' },
      { name: 'workdir', type: 'string', required: false, def: '/workspace' },
    ],
  },
  {
    id: 't5', name: 'github_api', group: 'mcp', desc: 'GitHub MCP：issues / PR / 仓库操作', enabled: true, danger: 'write',
    calls: 1892, failRate: 0.6, timeout: 12,
    schema: [
      { name: 'action', type: 'string', required: true, enum: ['list_issues', 'create_issue', 'merge_pr'], def: '' },
      { name: 'repo', type: 'string', required: true, def: 'acme/app' },
      { name: 'assignee', type: 'string', required: false, def: '' },
    ],
  },
  {
    id: 't6', name: 'slack_notify', group: 'mcp', desc: 'Slack 消息推送（#ops 频道）', enabled: true, danger: 'write',
    calls: 754, failRate: 0.2, timeout: 6,
    schema: [
      { name: 'channel', type: 'string', required: true, def: '#ops' },
      { name: 'text', type: 'string', required: true, def: '' },
      { name: 'thread_ts', type: 'string', required: false, def: '' },
    ],
  },
]

const GROUP_LABEL: Record<ToolDef['group'], string> = {
  builtin: '内置工具',
  custom: '自定义',
  mcp: 'MCP 工具',
}

const DANGER_META: Record<ToolDef['danger'], { label: string; cls: string }> = {
  read: { label: '只读', cls: 'blue' },
  write: { label: '写', cls: 'amber' },
  shell: { label: '执行 Shell', cls: 'red' },
}

interface McpConnection {
  id: string
  name: string
  transport: 'stdio' | 'http' | 'sse'
  endpoint: string
  tools: number
  status: 'connected' | 'disconnected' | 'error'
}

const MOCK_MCP: McpConnection[] = [
  { id: 'm1', name: 'GitHub MCP', transport: 'http', endpoint: 'https://mcp.example.com/github', tools: 12, status: 'connected' },
  { id: 'm2', name: 'Slack MCP', transport: 'http', endpoint: 'https://mcp.example.com/slack', tools: 8, status: 'connected' },
  { id: 'm3', name: '本地 Filesystem', transport: 'stdio', endpoint: 'npx -y @modelcontextprotocol/server-filesystem', tools: 6, status: 'connected' },
  { id: 'm4', name: '数据库 MCP', transport: 'sse', endpoint: 'https://db-mcp.internal/sse', tools: 0, status: 'error' },
]

export function ToolRegistry() {
  const [tools, setTools] = useState<ToolDef[]>(MOCK_TOOLS)
  const [selectedId, setSelectedId] = useState('t2')
  const [groupFilter, setGroupFilter] = useState<'all' | ToolDef['group']>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ t2: true })
  const [testArgs, setTestArgs] = useState('{"dimension":"product","from":"2026-08-01","to":"2026-08-10"}')
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; latency: number; output: string } | null>(null)

  /* MCP 向导 */
  const [wizardOpen, setWizardOpen] = useState(false)
  const [transport, setTransport] = useState<'stdio' | 'http' | 'sse'>('http')
  const [endpoint, setEndpoint] = useState('https://mcp.example.com/my-server')
  const [mcpConfig, setMcpConfig] = useState('{\n  "headers": {\n    "Authorization": "Bearer sk-..."\n  },\n  "timeout_ms": 10000\n}')
  const [connecting, setConnecting] = useState(false)
  const [discovered, setDiscovered] = useState<{ name: string; desc: string; selected: boolean }[]>([])
  const [connError, setConnError] = useState<string | null>(null)

  const [toast, setToast] = useState<string | null>(null)

  const selected = tools.find(t => t.id === selectedId) ?? tools[0]
  const filtered = tools.filter(t => groupFilter === 'all' || t.group === groupFilter)
  const enabledCount = tools.filter(t => t.enabled).length
  const mcpOk = MOCK_MCP.filter(m => m.status === 'connected').length

  const toggleTool = (id: string) => {
    const tool = tools.find(t => t.id === id)
    if (tool?.danger === 'shell' && tool.enabled) {
      if (!window.confirm('高危工具（可执行 shell）停用后 Agent 将无法使用，确认继续？')) return
    }
    setTools(prev => prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)))
    setToast(`工具「${tool?.name}」已${tools.find(t => t.id === id)?.enabled ? '停用' : '启用'}（热加载生效）`)
  }

  const runToolTest = () => {
    setTestRunning(true)
    setTestResult(null)
    setTimeout(() => {
      setTestResult({
        ok: Math.random() > 0.2,
        latency: 180 + Math.round(Math.random() * 500),
        output: selected.danger === 'shell'
          ? 'exit 0 · 8 files modified (dry-run)'
          : `[{"date":"2026-08-10","revenue":1284300,"dimension":"product"}], rows: 12`,
      })
      setTestRunning(false)
    }, 1200)
  }

  const runMCPConnect = async () => {
    setConnecting(true)
    setConnError(null)
    setDiscovered([])
    try {
      const res = await adminTestMCP({
        transport,
        url: transport === 'stdio' ? undefined : endpoint,
        command: transport === 'stdio' ? endpoint : undefined,
        config: { headers: { Authorization: 'Bearer sk-...' }, timeout_ms: 10000 },
      })
      if (!res.ok) setConnError(res.message ?? '连接失败')
    } catch {
      /* mock 兜底 */
    } finally {
      setConnecting(false)
      setDiscovered([
        { name: 'search_repo', desc: '搜索代码仓库', selected: true },
        { name: 'create_issue', desc: '创建 Issue', selected: true },
        { name: 'list_releases', desc: '列出 Release', selected: true },
        { name: 'get_commit', desc: '获取提交信息', selected: false },
      ])
    }
  }

  const confirmImport = () => {
    const picked = discovered.filter(d => d.selected)
    setTools(prev => [
      ...picked.map((p, i) => ({
        id: `mcp-${Date.now()}-${i}`,
        name: p.name,
        group: 'mcp' as const,
        desc: p.desc,
        enabled: false,
        danger: 'read' as const,
        calls: 0,
        failRate: 0,
        timeout: 10,
        schema: [{ name: 'input', type: 'object', required: true, def: '{}' }],
      })),
      ...prev,
    ])
    setWizardOpen(false)
    setToast(`已导入 ${picked.length} 个 MCP 工具（草稿状态）`)
    setDiscovered([])
  }

  return (
    <div className="admin-grid" style={{ gap: 14 }}>
      {/* 统计面板 */}
      <div className="admin-grid cols-4">
        <div className="admin-stat-card">
          <div className="admin-stat-label">🔧 工具总数</div>
          <div className="admin-stat-value">{tools.length}</div>
          <div className="admin-stat-delta flat">• 3 个分组</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">✅ 已启用</div>
          <div className="admin-stat-value">{enabledCount}</div>
          <div className="admin-stat-delta up">▲ 2 个新增</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">🔌 MCP 服务</div>
          <div className="admin-stat-value">{mcpOk}/{MOCK_MCP.length}</div>
          <div className="admin-stat-delta down">▼ 1 个异常</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">📞 今日调用</div>
          <div className="admin-stat-value">19,272</div>
          <div className="admin-stat-delta up">▲ 8.6%</div>
        </div>
      </div>

      <div className="admin-split left-2">
        {/* 工具列表 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">工具列表</span>
            <div className="admin-card-header-actions">
              {(['all', 'builtin', 'custom', 'mcp'] as const).map(g => (
                <button
                  key={g}
                  className={`admin-btn sm ${groupFilter === g ? 'primary' : 'ghost'}`}
                  onClick={() => setGroupFilter(g)}
                >
                  {g === 'all' ? '全部' : GROUP_LABEL[g]}
                </button>
              ))}
              <span className="admin-divider v" />
              <button className="admin-btn primary sm" onClick={() => setWizardOpen(true)}>+ 连接 MCP</button>
              <button className="admin-btn sm">+ 注册工具</button>
            </div>
          </div>
          <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
            <div className="admin-list">
              {filtered.map(t => {
                const isExpanded = expanded[t.id]
                return (
                  <div key={t.id}>
                    <div
                      className={`admin-list-item ${selectedId === t.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedId(t.id)
                        setExpanded(prev => ({ ...prev, [t.id]: !prev[t.id] }))
                      }}
                    >
                      <span className="admin-lamp" style={{ background: t.enabled ? 'var(--admin-success)' : 'var(--admin-text-3)' }} />
                      <div className="admin-list-item-main">
                        <div className="admin-list-item-title">
                          {t.name}
                          <span className="admin-tag gray" style={{ marginLeft: 6 }}>{GROUP_LABEL[t.group]}</span>
                          <span className={`admin-badge ${DANGER_META[t.danger].cls}`} style={{ marginLeft: 4 }}>{DANGER_META[t.danger].label}</span>
                        </div>
                        <div className="admin-list-item-sub">{t.desc} · 今日 {t.calls.toLocaleString()} 次 · 失败率 {t.failRate}%</div>
                      </div>
                      <div className="admin-list-item-meta">
                        <span className="admin-toggle" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={t.enabled} onChange={() => toggleTool(t.id)} />
                          <span className="admin-toggle-track" />
                        </span>
                      </div>
                    </div>
                    {/* Schema 可视化 + 试跑 */}
                    {isExpanded && (
                      <div style={{ background: 'var(--admin-surface-2)', borderTop: '1px solid var(--admin-border)', padding: '12px 14px' }}>
                        <div className="admin-grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-text-2)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                              JSON Schema 参数
                            </div>
                            <div className="admin-table-wrap">
                              <table className="admin-table">
                                <thead>
                                  <tr><th>参数</th><th>类型</th><th>必填</th><th>枚举</th><th>默认值</th></tr>
                                </thead>
                                <tbody>
                                  {t.schema.map(s => (
                                    <tr key={s.name}>
                                      <td className="mono" style={{ fontWeight: 600 }}>{s.name}</td>
                                      <td className="mono">{s.type}</td>
                                      <td>{s.required ? <span className="admin-badge red">必填</span> : <span className="admin-badge gray">可选</span>}</td>
                                      <td className="mono">{s.enum ? s.enum.join(' / ') : '—'}</td>
                                      <td className="mono">{s.def || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                              <button className="admin-btn sm">权限白名单</button>
                              <button className="admin-btn sm">安全限制</button>
                              <button className="admin-btn sm ghost">查看审计</button>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-text-2)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                              试跑（沙盒）
                            </div>
                            <textarea
                              className="admin-textarea"
                              rows={4}
                              value={testArgs}
                              onChange={e => setTestArgs(e.target.value)}
                              style={{ fontFamily: 'var(--admin-mono)', fontSize: 11.5 }}
                            />
                            <div className="admin-toolbar" style={{ marginTop: 8 }}>
                              <button className="admin-btn primary sm" onClick={runToolTest} disabled={testRunning}>
                                {testRunning ? <span className="spin" /> : '▶ 执行'}
                              </button>
                              {testResult && (
                                <span className={`admin-badge ${testResult.ok ? 'green' : 'red'}`}>
                                  {testResult.ok ? '✓' : '✗'} {testResult.latency}ms
                                </span>
                              )}
                            </div>
                            {testResult && (
                              <div className="admin-json" style={{ marginTop: 8, maxHeight: 140 }}>{testResult.output}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 右列：MCP 连接列表 */}
        <div className="admin-grid" style={{ gap: 14 }}>
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">MCP 连接</span>
              <span className="admin-card-sub">stdio / HTTP / SSE</span>
              <div className="admin-card-header-actions">
                <button className="admin-btn sm" onClick={() => setWizardOpen(true)}>+ 新增连接</button>
              </div>
            </div>
            <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
              <div className="admin-list">
                {MOCK_MCP.map(m => (
                  <div className="admin-list-item" key={m.id}>
                    <span className={`admin-lamp ${m.status === 'connected' ? 'green' : m.status === 'error' ? 'red' : 'gray'}`} />
                    <div className="admin-list-item-main">
                      <div className="admin-list-item-title">{m.name}</div>
                      <div className="admin-list-item-sub mono">{m.endpoint}</div>
                    </div>
                    <div className="admin-list-item-meta">
                      <span className={`admin-badge ${m.status === 'connected' ? 'green' : m.status === 'error' ? 'red' : 'gray'}`}>
                        {m.status === 'connected' ? `已连接 · ${m.tools} 工具` : m.status === 'error' ? '连接错误' : '未连接'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">调用审计（近 24h）</span>
              <span className="admin-card-sub">谁在何时调了啥</span>
            </div>
            <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>时间</th><th>工具</th><th>会话</th><th>结果</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['21:05:12', 'sales_query', 's-9f2a', '✓ 200ms'],
                      ['21:03:48', 'web_search', 's-9f2a', '✓ 310ms'],
                      ['21:01:02', 'github_api', 's-8c41', '✓ 1.2s'],
                      ['20:58:33', 'exec_shell', 's-8c41', '✗ 权限拒绝'],
                      ['20:55:17', 'slack_notify', 's-7b02', '✓ 180ms'],
                    ].map((r, i) => (
                      <tr key={i}>
                        <td className="mono">{r[0]}</td>
                        <td className="mono">{r[1]}</td>
                        <td className="mono">{r[2]}</td>
                        <td style={{ color: r[3].startsWith('✓') ? 'var(--admin-success)' : 'var(--admin-error)', fontWeight: 600 }}>{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="admin-note success" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1100 }}>✓ {toast}</div>}

      {/* ===== MCP 连接向导 ===== */}
      {wizardOpen && (
        <div className="admin-modal-overlay" onClick={() => setWizardOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">🔌 MCP 连接向导</span>
              <button className="admin-modal-close" onClick={() => setWizardOpen(false)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-row" style={{ marginBottom: 12 }}>
                <div className="admin-field">
                  <label className="admin-field-label">传输方式</label>
                  <select className="admin-select" value={transport} onChange={e => setTransport(e.target.value as 'stdio' | 'http' | 'sse')}>
                    <option value="stdio">stdio（本地命令）</option>
                    <option value="http">HTTP（流式）</option>
                    <option value="sse">SSE</option>
                  </select>
                </div>
                <div className="admin-field" style={{ flex: 2 }}>
                  <label className="admin-field-label">{transport === 'stdio' ? '启动命令' : '服务器 URL'}</label>
                  <input
                    className="admin-input mono"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder={transport === 'stdio' ? 'npx -y @modelcontextprotocol/server-xxx' : 'https://mcp.example.com/server'}
                  />
                </div>
              </div>
              <div className="admin-field">
                <label className="admin-field-label">连接配置（JSON）</label>
                <textarea
                  className="admin-textarea"
                  rows={6}
                  value={mcpConfig}
                  onChange={e => setMcpConfig(e.target.value)}
                  style={{ fontFamily: 'var(--admin-mono)', fontSize: 11.5 }}
                />
              </div>
              {connError && <div className="admin-note error" style={{ marginTop: 8 }}>✗ {connError}</div>}
              <div className="admin-toolbar" style={{ marginTop: 12 }}>
                <button className="admin-btn primary" onClick={runMCPConnect} disabled={connecting}>
                  {connecting ? <span className="spin" /> : '🧪 测试连接并探测工具'}
                </button>
                <span className="admin-field-hint">探测成功后下方列出可用工具，勾选导入</span>
              </div>

              {discovered.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>探测到 {discovered.length} 个工具：</div>
                  <div className="admin-list">
                    {discovered.map(d => (
                      <div className="admin-list-item" key={d.name}>
                        <span className="admin-toggle">
                          <input
                            type="checkbox"
                            checked={d.selected}
                            onChange={() => setDiscovered(prev => prev.map(x => (x.name === d.name ? { ...x, selected: !x.selected } : x)))}
                          />
                          <span className="admin-toggle-track" />
                        </span>
                        <div className="admin-list-item-main">
                          <div className="admin-list-item-title mono">{d.name}</div>
                          <div className="admin-list-item-sub">{d.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn" onClick={() => setWizardOpen(false)}>取消</button>
              <button className="admin-btn primary" onClick={confirmImport} disabled={discovered.length === 0}>
                导入 {discovered.filter(d => d.selected).length} 个工具
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
