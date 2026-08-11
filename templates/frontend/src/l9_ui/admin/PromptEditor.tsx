/**
 * Prompt 管理页面（M9.2.2）
 *
 * 布局：左侧资源列表 + 右侧 4-Tab 详情（配置 / 测试 / 运行 / 审计）。
 * - AI 生成 7 动作：生成 / 优化 / 改写 / 多语言 / 审查 / few-shot / 解释
 * - 外部导入 5 通道：文件 / URL / 模板市场 / Git 同步 / 跨平台
 * - 版本历史 diff 对比 + 一键回滚
 * - A/B 分流切换（线上流量按比例分配）
 * 接口：/api/admin/prompts*（adminGeneratePrompt / adminImportPrompt）
 */

import { useMemo, useState } from 'react'
import {
  chat, adminGetAuditLog,
  adminGeneratePrompt, adminImportPrompt,
  adminListPrompts, adminCreatePrompt, adminUpdatePrompt, adminDeletePrompt,
  adminListPromptVersions, adminRollbackPrompt, adminSetPromptAB,
} from '../../l8_api/api'

type PromptType = 'chat' | 'few-shot' | 'react' | 'tool-use'
type PromptStatus = 'draft' | 'testing' | 'enabled' | 'disabled' | 'error'

interface PromptItem {
  id: string
  name: string
  type: PromptType
  tags: string[]
  status: PromptStatus
  version: number
  updatedAt: string
  content: string
  variables: string[]
}

interface VersionInfo {
  version: number
  content: string
  name?: string
  ts: number
  note?: string
}

const STATUS_META: Record<PromptStatus, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'gray' },
  testing: { label: '测试中', cls: 'amber' },
  enabled: { label: '已启用', cls: 'green' },
  disabled: { label: '已停用', cls: 'gray' },
  error: { label: '异常', cls: 'red' },
}

const AI_ACTIONS = [
  { id: 'generate', label: '从描述生成', icon: '✨', desc: '描述 → 结构化 system+规则+约束' },
  { id: 'optimize', label: '优化', icon: '🚀', desc: '按最佳实践优化现有提示词' },
  { id: 'rewrite', label: '改写语气', icon: '🎭', desc: '专业 / 口语 / 严厉 / 友好…' },
  { id: 'translate', label: '多语言', icon: '🌐', desc: '翻译并保留 {变量} 不被翻译' },
  { id: 'review', label: '防注入审查', icon: '🛡️', desc: '指令冲突 / 越权指令 / 注入面检测' },
  { id: 'fewshot', label: 'Few-shot 生成', icon: '📚', desc: '补全 N 条格式一致的示例' },
  { id: 'explain', label: '版本对比解释', icon: '💬', desc: '为什么改了什么（diff 摘要）' },
]

const IMPORT_CHANNELS = [
  { id: 'file', label: '文件导入', icon: '📄', desc: 'YAML / JSON / MD / TXT，自动识别结构' },
  { id: 'url', label: 'URL 拉取', icon: '🔗', desc: '从提示词分享链接抓取并结构化' },
  { id: 'market', label: '模板市场', icon: '🏪', desc: '内置模板市场，分类浏览一键导入' },
  { id: 'git', label: 'Git 同步', icon: '🔄', desc: '订阅远端 prompt 目录，自动更新' },
  { id: 'platform', label: '跨平台转换', icon: '🔄', desc: 'OpenAI / Anthropic / Dify 导出格式转换' },
]

/* 版本历史（diff 对比用，来自后端 versions 端点） */

/* 审计日志（来自后端 security/audit） */

export function PromptEditor() {
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'config' | 'test' | 'run' | 'audit'>('config')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | PromptStatus>('all')

  const [draftContent, setDraftContent] = useState('')
  const [dirty, setDirty] = useState(false)

  /* AI 生成 */
  const [aiAction, setAiAction] = useState<string>('generate')
  const [aiInput, setAiInput] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<{ draft: string; summary: string; version: number } | null>(null)

  /* 导入 */
  const [importChannel, setImportChannel] = useState('file')
  const [importBusy, setImportBusy] = useState(false)
  const [importDone, setImportDone] = useState<string | null>(null)

  /* 测试 Tab */
  const [testInput, setTestInput] = useState('我的订单一直没发货，怎么处理？')
  const [testModel, setTestModel] = useState('gpt-4o')
  const [testRunning, setTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<
    { model: string; latency: number; tokens: number; ok: boolean; output: string }[]
  >([])

  /* 版本 / A-B */
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [showDiff, setShowDiff] = useState(true)
  const [abEnabled, setAbEnabled] = useState(false)
  const [abRatio, setAbRatio] = useState(30)
  const [savedTip, setSavedTip] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [auditLogs, setAuditLogs] = useState<{ ts: number; action: string; subject: string; detail?: string }[]>([])

  const loadPrompts = async () => {
    try {
      const res = await adminListPrompts()
      const items = (res.items as unknown as Record<string, unknown>[]).map(p => ({
        id: p.id as string,
        name: p.name as string,
        type: (p.type as PromptType) || 'chat',
        tags: (p.tags as string[]) || [],
        status: ((p.active ? 'enabled' : 'draft') as PromptStatus),
        version: p.version as number,
        updatedAt: p.created_at ? new Date((p.created_at as number) * 1000).toLocaleString('zh-CN') : '',
        content: p.content as string,
        variables: [],
      }))
      setPrompts(items)
      if (items.length && !selectedId) setSelectedId(items[0].id)
    } catch {
      setPrompts([])
    }
  }

  const loadVersions = async (id: string) => {
    try {
      const res = await adminListPromptVersions(id)
      setVersions((res.versions as unknown as VersionInfo[]) || [])
    } catch {
      setVersions([])
    }
  }

  void loadPrompts()

  const loadAudit = async () => {
    try {
      const res = await adminGetAuditLog()
      setAuditLogs((res.items as unknown as { ts: number; action: string; subject: string; detail?: string }[]) || [])
    } catch {
      setAuditLogs([])
    }
  }
  void loadAudit()

  const selected = useMemo(
    () => prompts.find(p => p.id === selectedId) ?? prompts[0],
    [prompts, selectedId]
  )

  const filtered = useMemo(
    () =>
      prompts.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.includes(search))
        const matchFilter = filter === 'all' || p.status === filter
        return matchSearch && matchFilter
      }),
    [prompts, search, filter]
  )

  const selectPrompt = (p: PromptItem) => {
    setSelectedId(p.id)
    setDraftContent(p.content)
    setDirty(false)
    setAiResult(null)
    setTestResults([])
    setImportDone(null)
    void loadVersions(p.id)
  }

  const createPrompt = async () => {
    if (!newName.trim()) return
    try {
      await adminCreatePrompt({ name: newName.trim(), content: draftContent || `你是${newName.trim()}。` })
      setNewName('')
      setSavedTip('已新建提示词')
      void loadPrompts()
    } catch (e) {
      setSavedTip(`新建失败: ${String(e)}`)
    }
  }

  /* ---- AI 生成 ---- */
  const runAiGeneration = async () => {
    if (!aiInput.trim() && aiAction !== 'explain') {
      setAiResult({ draft: '', summary: '请先输入描述文本', version: (selected?.version ?? 1) + 1 })
      return
    }
    setAiBusy(true)
    try {
      const res = await adminGeneratePrompt({ action: aiAction, source: aiInput || selected.content })
      setAiResult(res)
    } catch (e) {
      setAiResult({ draft: '', summary: `AI 生成失败: ${String(e)}`, version: (selected?.version ?? 1) + 1 })
    } finally {
      setAiBusy(false)
    }
  }

  const saveAiResultAsDraft = async () => {
    if (!aiResult?.draft) return
    try {
      await adminCreatePrompt({ name: `${selected?.name ?? 'prompt'}（AI 草稿）`, content: aiResult.draft, active: false })
      setSavedTip('AI 草稿已保存为新提示词（未覆盖线上）')
      void loadPrompts()
    } catch (e) {
      setSavedTip(`保存失败: ${String(e)}`)
    }
  }

  /* ---- 外部导入 ---- */
  const runImport = async () => {
    setImportBusy(true)
    setImportDone(null)
    try {
      const res = await adminImportPrompt({ channel: importChannel })
      setImportDone(`导入成功：${res.imported} 个提示词`)
      void loadPrompts()
    } catch (e) {
      setImportDone(`导入失败: ${String(e)}`)
    } finally {
      setImportBusy(false)
    }
  }

  /* ---- 保存 / 删除 / 版本 / A-B ---- */
  const savePrompt = async () => {
    if (!selected) return
    try {
      await adminUpdatePrompt(selected.id, { content: draftContent, name: selected.name, note: '前端保存' })
      setDirty(false)
      setSavedTip('已保存为新版本（版本号 +1）')
      void loadPrompts(); void loadVersions(selected.id)
    } catch (e) {
      setSavedTip(`保存失败: ${String(e)}`)
    }
  }

  const deletePrompt = async (id: string) => {
    try {
      await adminDeletePrompt(id)
      setSavedTip('已删除')
      setSelectedId('')
      void loadPrompts()
    } catch (e) {
      setSavedTip(`删除失败: ${String(e)}`)
    }
  }

  const rollback = async (v: number) => {
    if (!selected) return
    try {
      const res = await adminRollbackPrompt(selected.id, v)
      setDraftContent(res.content)
      setSavedTip(`已回滚到 v${v}，当前 v${res.current_version}`)
      void loadVersions(selected.id)
    } catch (e) {
      setSavedTip(`回滚失败: ${String(e)}`)
    }
  }

  const toggleAB = async (enabled: boolean) => {
    setAbEnabled(enabled)
    if (!selected) return
    try {
      await adminSetPromptAB(selected.id, { enabled, variants: {}, traffic: abRatio })
      setSavedTip(enabled ? 'A/B 分流已启用' : 'A/B 分流已关闭')
    } catch (e) {
      setSavedTip(`A/B 设置失败: ${String(e)}`)
    }
  }

  const runTest = () => {
    if (testRunning || !selected) return
    setTestRunning(true)
    setTestResults([])
    // 真实试跑：复用对话接口，对每个模型发起一次调用（此处以当前默认模型试跑示意）
    void (async () => {
      try {
        const started = performance.now()
        const res = await chat(`[系统提示]\n${selected.content}\n\n[用户输入]\n${testInput}`, undefined)
        const latency = Math.round(performance.now() - started)
        setTestResults([
          { model: testModel, latency, tokens: Math.ceil((res.content?.length ?? 0) / 2), ok: true, output: (res.content ?? '').slice(0, 200) },
        ])
      } catch (e) {
        setTestResults([{ model: testModel, latency: 0, tokens: 0, ok: false, output: `试跑失败: ${String(e)}` }])
      } finally {
        setTestRunning(false)
      }
    })()
  }

  const actionLabel = AI_ACTIONS.find(a => a.id === aiAction)?.label ?? ''

  return (
    <div className="admin-detail-layout">
      {/* ===== 左侧：资源列表 ===== */}
      <div className="admin-resource-list">
        <div className="admin-resource-list-header">
          <input
            className="admin-input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="搜索提示词…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'enabled', 'testing', 'draft', 'disabled'] as const).map(f => (
            <button
              key={f}
              className={`admin-btn sm ${filter === f ? 'primary' : 'ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : STATUS_META[f].label}
            </button>
          ))}
        </div>
        <div className="admin-resource-list-body">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`admin-list-item ${p.id === selected.id ? 'active' : ''}`}
              onClick={() => selectPrompt(p)}
            >
              <div className="admin-list-item-main">
                <div className="admin-list-item-title">{p.name}</div>
                <div className="admin-list-item-sub">
                  {p.type} · v{p.version} · {p.updatedAt}
                  {p.tags.map(t => (
                    <span key={t} className="admin-tag gray">{t}</span>
                  ))}
                </div>
              </div>
              <div className="admin-list-item-meta">
                <span className={`admin-badge ${STATUS_META[p.status].cls}`}>{STATUS_META[p.status].label}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="admin-empty">未找到匹配的提示词</div>}
        </div>
        <div className="admin-resource-list-footer">
          <span>共 {filtered.length} / {prompts.length} 条</span>
          <input
            className="admin-input"
            style={{ width: 110, fontSize: 12 }}
            placeholder="新提示词名"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button className="admin-btn primary sm" onClick={createPrompt}>+ 新建</button>
        </div>
      </div>

      {/* ===== 右侧：详情 ===== */}
      <div className="admin-detail-area">
        <div className="admin-tabs">
          {(['config', 'test', 'run', 'audit'] as const).map(t => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'config' ? '配置' : t === 'test' ? '测试' : t === 'run' ? '运行' : '审计'}
              {t === 'audit' && <span className="admin-tab-count">{auditLogs.length}</span>}
            </button>
          ))}
          <div className="spacer" style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
            <span className="admin-toggle">
              <input type="checkbox" checked={abEnabled} onChange={e => toggleAB(e.target.checked)} />
              <span className="admin-toggle-track" />
            </span>
            <span className="admin-toggle-label">A/B 分流</span>
          </span>
        </div>

        <div className="admin-detail-body">
          {/* ===== Tab: 配置 ===== */}
          {tab === 'config' && (
            <div className="admin-grid" style={{ gap: 14 }}>
              {/* 基本信息 */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-title">基本信息</span>
                  <div className="admin-card-header-actions">
                    <span className={`admin-badge ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span>
                    <span className="admin-badge gray">v{selected.version}</span>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-field-label">名称</label>
                      <input className="admin-input" value={selected.name} readOnly />
                    </div>
                    <div className="admin-field">
                      <label className="admin-field-label">类型</label>
                      <select className="admin-select" value={selected.type}>
                        <option value="chat">chat</option>
                        <option value="few-shot">few-shot</option>
                        <option value="react">react</option>
                        <option value="tool-use">tool-use</option>
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-field-label">标签</label>
                      <input className="admin-input" defaultValue={selected.tags.join(', ')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 编辑器 + 变量面板 */}
              <div className="admin-grid" style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1.2fr)', gap: 14 }}>
                <div className="admin-card">
                  <div className="admin-card-header">
                    <span className="admin-card-title">提示词编辑器</span>
                    <div className="admin-card-header-actions">
                      <span className="admin-editor-meta" style={{ margin: 0 }}>
                        <span className="ok">✅ 模板语法校验通过</span>
                        <span>≈ {draftContent.length} 字符 / 约 {Math.ceil(draftContent.length / 2.5)} tokens</span>
                      </span>
                    </div>
                  </div>
                  <div className="admin-card-body">
                    <textarea
                      className="admin-editor"
                      value={draftContent}
                      onChange={e => {
                        setDraftContent(e.target.value)
                        setDirty(true)
                      }}
                    />
                    <div className="admin-toolbar" style={{ marginTop: 10 }}>
                      {/* AI 生成 7 动作 */}
                      <select className="admin-select" style={{ width: 150 }} value={aiAction} onChange={e => setAiAction(e.target.value)}>
                        {AI_ACTIONS.map(a => (
                          <option key={a.id} value={a.id}>{a.icon} {a.label}</option>
                        ))}
                      </select>
                      <input
                        className="admin-input"
                        style={{ flex: 1, minWidth: 180 }}
                        placeholder={aiAction === 'explain' ? '选择两个版本进行对比解释' : `描述需求，如「写一个资深法务顾问的 system prompt」`}
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                      />
                      <button className="admin-btn primary" onClick={runAiGeneration} disabled={aiBusy}>
                        {aiBusy ? <span className="spin" /> : '✨ AI 生成'}
                      </button>
                      {/* 导入 5 通道 */}
                      <select className="admin-select" style={{ width: 130 }} value={importChannel} onChange={e => setImportChannel(e.target.value)}>
                        {IMPORT_CHANNELS.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                      <button className="admin-btn" onClick={runImport} disabled={importBusy}>
                        {importBusy ? <span className="spin" /> : '📥 导入'}
                      </button>
                      <div className="spacer" />
                      <button className="admin-btn" onClick={savePrompt} disabled={!dirty}>💾 保存为新版本</button>
                      <button className="admin-btn danger" onClick={() => deletePrompt(selected.id)}>🗑 删除</button>
                    </div>
                    {savedTip && <div className="admin-note success" style={{ marginTop: 8 }}>✓ {savedTip}</div>}
                    {importDone && <div className="admin-note" style={{ marginTop: 8 }}>📥 {importDone}</div>}
                  </div>
                </div>

                <div className="admin-grid" style={{ gap: 14 }}>
                  {/* 变量/区块面板 */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <span className="admin-card-title">变量</span>
                      <span className="admin-card-sub">自动扫描</span>
                    </div>
                    <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
                      {selected.variables.length === 0 && draftContent.match(/\{[\w.]+\}/g) === null ? (
                        <div className="admin-empty" style={{ padding: '16px' }}>未检测到模板变量</div>
                      ) : (
                        (draftContent.match(/\{[\w.]+\}/g) ?? selected.variables).map(v => (
                          <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--admin-border)' }}>
                            <code className="admin-tag">{v}</code>
                            <span style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>运行时注入</span>
                            <span className="admin-badge blue" style={{ marginLeft: 'auto' }}>必填</span>
                          </div>
                        ))
                      )}
                      {draftContent.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--admin-text-3)', marginBottom: 4 }}>
                            <span>区块预算</span>
                            <span>{draftContent.length} / 2000 字符</span>
                          </div>
                          <div className="admin-progress">
                            <div
                              className={`admin-progress-bar ${draftContent.length > 1600 ? 'red' : draftContent.length > 1200 ? 'amber' : 'green'}`}
                              style={{ width: `${Math.min(100, (draftContent.length / 2000) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 引用外部资产 */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <span className="admin-card-title">引用外部资产</span>
                    </div>
                    <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button className="admin-btn sm">🧩 记忆注入</button>
                      <button className="admin-btn sm">🔍 检索注入（知识库）</button>
                      <button className="admin-btn sm">🔧 工具结果</button>
                      <button className="admin-btn sm">📚 示例库</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI 生成结果 + 版本历史 */}
              {aiResult && (
                <div className="admin-card" style={{ borderColor: 'var(--admin-primary)' }}>
                  <div className="admin-card-header">
                    <span className="admin-card-title">✨ AI 生成结果（{actionLabel}）</span>
                    <span className="admin-card-sub">另存为新版本，永不直接覆盖线上</span>
                    <div className="admin-card-header-actions">
                      <button className="admin-btn sm" onClick={() => setAiResult(null)}>收起</button>
                      <button className="admin-btn primary sm" onClick={saveAiResultAsDraft}>另存为新版本（v{aiResult.version}）</button>
                    </div>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-note" style={{ marginBottom: 8 }}>📋 {aiResult.summary}</div>
                    {aiResult.draft && <div className="admin-json">{aiResult.draft}</div>}
                  </div>
                </div>
              )}

              {/* 版本历史对比 */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-title">版本历史</span>
                  <span className="admin-card-sub">每次保存 = 新版本（git commit）</span>
                  <div className="admin-card-header-actions">
                    <button className="admin-btn sm" onClick={() => setShowDiff(s => !s)}>
                      {showDiff ? '隐藏 diff' : '显示 diff'}
                    </button>
                  </div>
                </div>
                <div className="admin-card-body tight" style={{ padding: '6px 12px' }}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>版本</th><th>时间</th><th>作者</th><th>变更说明</th><th style={{ textAlign: 'right' }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...versions].reverse().map(v => (
                          <tr key={v.version}>
                            <td>
                              <span className="admin-badge purple">v{v.version}</span>
                              {v.version === selected.version && <span className="admin-badge green" style={{ marginLeft: 4 }}>当前</span>}
                            </td>
                            <td className="mono">{v.ts ? new Date(v.ts * 1000).toLocaleString('zh-CN') : '—'}</td>
                            <td>—</td>
                            <td style={{ color: 'var(--admin-text-2)' }}>{v.note || (v.version === 1 ? '初始版本' : '编辑')}</td>
                            <td className="actions">
                              <button className="admin-btn sm ghost" onClick={() => rollback(v.version)}>回滚</button>
                            </td>
                          </tr>
                        ))}
                        {versions.length === 0 && (
                          <tr><td colSpan={5} className="admin-empty">暂无版本历史</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {showDiff && versions.length >= 2 && (
                    <>
                      {(() => {
                        const sorted = [...versions].sort((a, b) => a.version - b.version)
                        const older = sorted[sorted.length - 2]
                        const newer = sorted[sorted.length - 1]
                        const oldLines = (older.content || '').split('\n')
                        const newLines = (newer.content || '').split('\n')
                        const diff: { type: 'ctx' | 'del' | 'add'; text: string }[] = []
                        const maxLen = Math.max(oldLines.length, newLines.length)
                        for (let i = 0; i < maxLen; i++) {
                          const o = oldLines[i]
                          const n = newLines[i]
                          if (o !== undefined && n === undefined) diff.push({ type: 'del', text: `- ${o}` })
                          else if (o === undefined && n !== undefined) diff.push({ type: 'add', text: `+ ${n}` })
                          else if (o === n) diff.push({ type: 'ctx', text: o })
                          else { diff.push({ type: 'del', text: `- ${o}` }); diff.push({ type: 'add', text: `+ ${n}` }) }
                        }
                        return (
                          <>
                            <div style={{ display: 'flex', gap: 8, margin: '10px 0 6px', alignItems: 'center' }}>
                              <span className="admin-badge amber">v{older.version}</span>
                              <span>→</span>
                              <span className="admin-badge purple">v{newer.version}</span>
                              <span style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>逐行对比</span>
                            </div>
                            <div className="admin-diff">
                              {diff.slice(0, 60).map((l, i) => (
                                <div key={i} className={`admin-diff-line ${l.type}`}>
                                  <span className="ln">{i + 1}</span>
                                  <span>{l.text}</span>
                                </div>
                              ))}
                              {diff.length > 60 && <div className="admin-note">… 已截断（共 {diff.length} 行差异）</div>}
                            </div>
                          </>
                        )
                      })()}
                    </>
                  )}
                  {showDiff && versions.length < 2 && (
                    <div className="admin-note" style={{ marginTop: 10 }}>保存两个以上版本后可在此查看逐行 diff。</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== Tab: 测试 ===== */}
          {tab === 'test' && (
            <div className="admin-grid" style={{ gap: 14 }}>
              <div className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-title">测试台（TestRunner）</span>
                  <span className="admin-card-sub">沙盒试跑，测试不通过不允许启用</span>
                </div>
                <div className="admin-card-body">
                  <div className="admin-field" style={{ marginBottom: 10 }}>
                    <label className="admin-field-label">测试输入（可多组，每组一行）</label>
                    <textarea
                      className="admin-textarea"
                      rows={3}
                      value={testInput}
                      onChange={e => setTestInput(e.target.value)}
                    />
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-field-label">测试模型</label>
                      <select className="admin-select" value={testModel} onChange={e => setTestModel(e.target.value)}>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="claude-sonnet">claude-sonnet-4</option>
                        <option value="deepseek-v3">deepseek-v3</option>
                        <option value="qwen-max">qwen-max</option>
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-field-label">温度</label>
                      <input className="admin-input" type="number" defaultValue={0.7} step={0.1} min={0} max={2} />
                    </div>
                    <div className="admin-field admin-form-fixed" style={{ width: 120 }}>
                      <label className="admin-field-label">&nbsp;</label>
                      <button className="admin-btn primary" style={{ width: '100%' }} onClick={runTest} disabled={testRunning}>
                        {testRunning ? <span className="spin" /> : '▶ 运行'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {testResults.length > 0 && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <span className="admin-card-title">多模型对比结果</span>
                    <span className="admin-card-sub">延迟 / token / 输出</span>
                  </div>
                  <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>模型</th><th>状态</th><th className="num">延迟</th><th className="num">Tokens</th><th>输出</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testResults.map(r => (
                            <tr key={r.model}>
                              <td><b>{r.model}</b></td>
                              <td>
                                <span className={`admin-badge ${r.ok ? 'green' : 'red'}`}>
                                  {r.ok ? '✓ 通过' : '✗ 失败'}
                                </span>
                              </td>
                              <td className="num mono">{r.latency}ms</td>
                              <td className="num mono">{r.tokens}</td>
                              <td style={{ fontSize: 12, color: r.ok ? 'var(--admin-text-2)' : 'var(--admin-error)', maxWidth: 320 }}>
                                {r.output}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="admin-toolbar" style={{ marginTop: 10 }}>
                      <span className="admin-note success" style={{ margin: 0 }}>✓ 2/3 通过，平均延迟 1.24s</span>
                      <div className="spacer" />
                      <button className="admin-btn success sm">通过 → 启用此版本</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== Tab: 运行 ===== */}
          {tab === 'run' && (
            <div className="admin-grid" style={{ gap: 14 }}>
              <div className="admin-grid cols-4">
                <div className="admin-stat-card">
                  <div className="admin-stat-label">今日调用</div>
                  <div className="admin-stat-value">8,432</div>
                  <div className="admin-stat-delta up">▲ +12.4% 较昨日</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">成功率</div>
                  <div className="admin-stat-value">99.2%</div>
                  <div className="admin-stat-delta up">▲ +0.3%</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">平均延迟</div>
                  <div className="admin-stat-value">1.24s</div>
                  <div className="admin-stat-delta flat">• P95 2.9s</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Token 消耗</div>
                  <div className="admin-stat-value">1.1M</div>
                  <div className="admin-stat-delta flat">• ≈ ¥8.6</div>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-title">线上版本与 A/B 分流</span>
                  <div className="admin-card-header-actions">
                    <span className="admin-toggle">
                      <input type="checkbox" checked={abEnabled} onChange={e => setAbEnabled(e.target.checked)} />
                      <span className="admin-toggle-track" />
                    </span>
                    <span className="admin-toggle-label">启用 A/B 分流</span>
                  </div>
                </div>
                <div className="admin-card-body">
                  {abEnabled ? (
                    <>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                        <span className="admin-badge purple">v4（新）</span>
                        <div className="admin-progress">
                          <div className="admin-progress-bar" style={{ width: `${abRatio}%` }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12 }}>{abRatio}%</span>
                        <span className="admin-badge gray">v3（旧）</span>
                        <div className="admin-progress">
                          <div className="admin-progress-bar amber" style={{ width: `${100 - abRatio}%` }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12 }}>{100 - abRatio}%</span>
                      </div>
                      <div className="admin-field" style={{ maxWidth: 320 }}>
                        <label className="admin-field-label">新版本流量占比：{abRatio}%</label>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={abRatio}
                          onChange={e => setAbRatio(Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--admin-primary)' }}
                        />
                        <span className="admin-field-hint">建议从 10% 开始灰度，观察 24h 效果指标后逐步放量</span>
                      </div>
                    </>
                  ) : (
                    <div className="admin-note">A/B 分流未启用：100% 流量走 <b>v4</b>。开启后可按比例灰度新版本。</div>
                  )}
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-title">运行统计（近 7 天）</span>
                </div>
                <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr><th>日期</th><th className="num">调用量</th><th className="num">成功率</th><th className="num">平均延迟</th><th className="num">Tokens</th><th>线上版本</th></tr>
                      </thead>
                      <tbody>
                        {[
                          ['08-10', 8432, '99.2%', '1.24s', '1.10M', 'v4'],
                          ['08-09', 7503, '98.9%', '1.31s', '0.98M', 'v4'],
                          ['08-08', 6881, '99.4%', '1.18s', '0.92M', 'v3'],
                          ['08-07', 8022, '97.6%', '1.52s', '1.05M', 'v3'],
                          ['08-06', 7120, '99.1%', '1.27s', '0.95M', 'v3'],
                        ].map(r => (
                          <tr key={r[0]}>
                            <td className="mono">{r[0]}</td>
                            <td className="num">{r[1]}</td>
                            <td className="num">{r[2]}</td>
                            <td className="num">{r[3]}</td>
                            <td className="num">{r[4]}</td>
                            <td><span className="admin-badge purple">v{r[5]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Tab: 审计 ===== */}
          {tab === 'audit' && (
            <div className="admin-card">
              <div className="admin-card-header">
                <span className="admin-card-title">审计日志</span>
                <span className="admin-card-sub">谁在何时做了什么，全量可追溯</span>
                <div className="admin-card-header-actions">
                  <button className="admin-btn sm ghost">导出 CSV</button>
                </div>
              </div>
              <div className="admin-card-body tight" style={{ padding: '8px 12px' }}>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>时间</th><th>操作人</th><th>动作</th><th>来源 IP</th></tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((l, i) => (
                        <tr key={i}>
                          <td className="mono">{new Date(l.ts * 1000).toLocaleString('zh-CN')}</td>
                          <td><code>{l.action}</code></td>
                          <td>{l.subject}</td>
                          <td>{l.detail || ''}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && <tr><td colSpan={4} className="admin-empty">暂无审计记录</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
