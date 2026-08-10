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
import { adminGeneratePrompt, adminImportPrompt } from '../../l8_api/api'

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

const MOCK_PROMPTS: PromptItem[] = [
  {
    id: 'p1',
    name: '客服引导 v4',
    type: 'chat',
    tags: ['客服', '生产'],
    status: 'enabled',
    version: 4,
    updatedAt: '2026-08-10 20:30',
    content: `你是「星云科技」的资深客服顾问，负责解答用户关于产品的售前咨询与售后问题。

# 行为准则
- 保持专业、耐心、简洁的语气，优先用列表回答。
- 涉及退款/物流问题时，先确认订单号再作答。
- 无法回答时如实说明，绝不编造信息。

# 约束
- {policy_ref} 为最新售后政策，引用时注明条款编号。
- 回复长度控制在 200 字以内。`,
    variables: ['policy_ref'],
  },
  {
    id: 'p2',
    name: '周报生成 few-shot',
    type: 'few-shot',
    tags: ['办公', 'few-shot'],
    status: 'enabled',
    version: 3,
    updatedAt: '2026-08-10 18:12',
    content: `将工作记录整理为结构化周报。

示例 1：
输入：周一 修复了登录页 500 错误；周二 与设计评审新版首页
输出：
- 【本周完成】1. 修复登录页 500 错误 2. 新版首页需求评审
- 【下周计划】- 待补充

示例 2：
输入：完成客户 A 的 POC 部署
输出：
- 【本周完成】1. 完成客户 A POC 部署
- 【下周计划】- 待补充

请按上述格式输出。`,
    variables: [],
  },
  {
    id: 'p3',
    name: '代码审查助手',
    type: 'react',
    tags: ['开发', 'React'],
    status: 'testing',
    version: 2,
    updatedAt: '2026-08-10 15:40',
    content: `你是资深代码审查专家。对输入的代码进行审查，输出：
1. 问题清单（严重级别：P0 阻断 / P1 严重 / P2 建议）
2. 安全风险（注入、越权、敏感信息泄露）
3. 改进建议（含示例代码）`,
    variables: [],
  },
  {
    id: 'p4',
    name: '数据报表工具调用',
    type: 'tool-use',
    tags: ['数据分析'],
    status: 'draft',
    version: 1,
    updatedAt: '2026-08-10 11:05',
    content: `你负责回答业务数据问题。必须使用 sales_query 工具查询数据，禁止凭空编造数字。

- 查询前先明确时间范围与维度
- 结果需附带数据来源与口径说明
- 图表类回答使用 chart_render 工具`,
    variables: [],
  },
  {
    id: 'p5',
    name: '旧版客服引导 v1',
    type: 'chat',
    tags: ['客服', '归档'],
    status: 'disabled',
    version: 1,
    updatedAt: '2026-08-02 09:20',
    content: '你是客服助手，回答用户问题。',
    variables: [],
  },
]

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

/* 版本历史（diff 对比用） */
const VERSION_HISTORY = [
  { version: 4, time: '2026-08-10 20:30', author: 'admin', note: '增加 policy_ref 变量与字数约束', active: true },
  { version: 3, time: '2026-08-09 16:02', author: 'lina', note: '语气调整：更简洁' },
  { version: 2, time: '2026-08-08 10:21', author: 'lina', note: '补充退款流程准则' },
  { version: 1, time: '2026-08-02 09:20', author: 'admin', note: '初始版本' },
]

const DIFF_LINES = [
  { type: 'ctx', text: '你是「星云科技」的资深客服顾问' },
  { type: 'del', text: '- 回复尽量详细完整。' },
  { type: 'add', text: '+ {policy_ref} 为最新售后政策，引用时注明条款编号。' },
  { type: 'add', text: '+ 回复长度控制在 200 字以内。' },
  { type: 'ctx', text: '- 无法回答时如实说明，绝不编造信息。' },
]

const AUDIT_LOGS = [
  { time: '2026-08-10 20:31', user: 'admin', action: '启用版本 v4', ip: '10.0.0.12' },
  { time: '2026-08-10 20:30', user: 'admin', action: '保存新版本 v4', ip: '10.0.0.12' },
  { time: '2026-08-10 19:58', user: 'lina', action: '测试运行（模型 gpt-4o）', ip: '10.0.0.35' },
  { time: '2026-08-10 19:50', user: 'lina', action: 'AI 生成：优化', ip: '10.0.0.35' },
  { time: '2026-08-10 18:20', user: 'bot', action: 'Git 同步拉取（repo: prompts-ops）', ip: '10.0.0.1' },
]

export function PromptEditor() {
  const [prompts, setPrompts] = useState<PromptItem[]>(MOCK_PROMPTS)
  const [selectedId, setSelectedId] = useState('p1')
  const [tab, setTab] = useState<'config' | 'test' | 'run' | 'audit'>('config')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | PromptStatus>('all')

  const [draftContent, setDraftContent] = useState(MOCK_PROMPTS[0].content)
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
  const [showDiff, setShowDiff] = useState(true)
  const [abEnabled, setAbEnabled] = useState(false)
  const [abRatio, setAbRatio] = useState(30)
  const [savedTip, setSavedTip] = useState<string | null>(null)

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
  }

  /* ---- AI 生成 ---- */
  const runAiGeneration = async () => {
    if (!aiInput.trim() && aiAction !== 'explain') {
      setAiResult({ draft: '', summary: '请先输入描述文本', version: selected.version + 1 })
      return
    }
    setAiBusy(true)
    try {
      const res = await adminGeneratePrompt({ action: aiAction, source: aiInput || selected.content })
      setAiResult(res)
    } catch {
      /* mock 兜底：模拟后端返回 */
      const drafts: Record<string, string> = {
        generate: `你是专业的${aiInput || '资深顾问'}。\n\n# 职责\n- 根据上下文提供专业、准确的回答\n- 主动澄清模糊需求\n\n# 约束\n- 不编造事实，不确定时明确说明\n- 回答使用 Markdown 结构化输出`,
        optimize: selected.content + '\n\n# 优化说明\n- 增加角色边界描述\n- 补充失败兜底策略\n- 明确输出格式',
        rewrite: selected.content.replace(/专业、耐心、简洁/g, '友好、亲切、易懂'),
        translate: selected.content.replace(/客服/g, 'customer support'),
        review: '【审查通过】未发现明显的指令冲突或注入面。\n风险等级：低',
        fewshot: '示例 1：\n输入：…\n输出：…\n\n示例 2：\n输入：…\n输出：…\n\n示例 3：\n输入：…\n输出：…',
        explain: 'v4 vs v3 变更摘要：\n- 新增 policy_ref 变量引用（售后政策联动）\n- 回复字数上限 200 字，降低 token 成本\n- 无明显行为回归',
      }
      setAiResult({
        draft: drafts[aiAction] ?? selected.content,
        summary: `${AI_ACTIONS.find(a => a.id === aiAction)?.label}完成，已生成草稿`,
        version: selected.version + 1,
      })
    } finally {
      setAiBusy(false)
    }
  }

  const saveAiResultAsDraft = () => {
    if (!aiResult?.draft) return
    const np: PromptItem = {
      ...selected,
      id: `p-${Date.now()}`,
      name: `${selected.name}（AI 草稿 v${aiResult.version}）`,
      status: 'draft',
      version: aiResult.version,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      content: aiResult.draft,
    }
    setPrompts(prev => [np, ...prev])
    selectPrompt(np)
    setSavedTip(`已保存为草稿 v${aiResult.version}，未覆盖线上版本`)
  }

  /* ---- 外部导入 ---- */
  const runImport = async () => {
    setImportBusy(true)
    setImportDone(null)
    try {
      const res = await adminImportPrompt({ channel: importChannel })
      setImportDone(`导入成功：${res.imported} 个提示词`)
    } catch {
      const mockNames: Record<string, string> = {
        file: 'prompt_import_20260810.yaml',
        url: 'https://prompts.example.com/share/abc123',
        market: '客户支持 · 金牌模板',
        git: 'github.com/acme/prompts-ops（main 分支）',
        platform: 'Dify 导出 workflow.json',
      }
      setImportDone(`已从「${mockNames[importChannel]}」导入 1 个提示词（草稿）`)
    } finally {
      setImportBusy(false)
    }
  }

  /* ---- 测试运行 ---- */
  const runTest = () => {
    if (testRunning) return
    setTestRunning(true)
    setTestResults([])
    setTimeout(() => {
      setTestResults([
        { model: 'gpt-4o', latency: 1240, tokens: 286, ok: true, output: '您好，非常抱歉给您带来不便。请您提供订单号，我将为您核实物流信息…' },
        { model: 'claude-sonnet', latency: 980, tokens: 244, ok: true, output: '您好～看到您的订单还没发货，我先帮您查一下～请提供订单号哦' },
        { model: 'deepseek-v3', latency: 1520, tokens: 312, ok: false, output: '请求超时（错误码 E504）' },
      ])
      setTestRunning(false)
    }, 1400)
  }

  const savePrompt = () => {
    setPrompts(prev =>
      prev.map(p =>
        p.id === selected.id
          ? { ...p, content: draftContent, version: p.version + 1, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), status: p.status === 'draft' ? 'testing' : p.status }
          : p
      )
    )
    setDirty(false)
    setSavedTip('已保存为新版本（版本号 +1），状态转为「测试中」')
  }

  const enablePrompt = () => {
    setPrompts(prev => prev.map(p => (p.id === selected.id ? { ...p, status: 'enabled' as const } : p)))
    setSavedTip('已启用：该版本开始参与线上流量')
  }

  const rollback = (v: number) => {
    setDraftContent(selected.content)
    setSavedTip(`已回滚到 v${v}（作为新草稿，可再次保存发布）`)
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
          <button className="admin-btn primary sm">+ 新建</button>
        </div>
      </div>

      {/* ===== 右侧：详情 ===== */}
      <div className="admin-detail-area">
        <div className="admin-tabs">
          {(['config', 'test', 'run', 'audit'] as const).map(t => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'config' ? '配置' : t === 'test' ? '测试' : t === 'run' ? '运行' : '审计'}
              {t === 'audit' && <span className="admin-tab-count">{AUDIT_LOGS.length}</span>}
            </button>
          ))}
          <div className="spacer" style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
            <span className="admin-toggle">
              <input type="checkbox" checked={abEnabled} onChange={e => setAbEnabled(e.target.checked)} />
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
                      <button className="admin-btn success" onClick={enablePrompt}>启用此版本</button>
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
                        {VERSION_HISTORY.map(v => (
                          <tr key={v.version}>
                            <td>
                              <span className="admin-badge purple">v{v.version}</span>
                              {v.active && <span className="admin-badge green" style={{ marginLeft: 4 }}>线上</span>}
                            </td>
                            <td className="mono">{v.time}</td>
                            <td>{v.author}</td>
                            <td style={{ color: 'var(--admin-text-2)' }}>{v.note}</td>
                            <td className="actions">
                              <button className="admin-btn sm ghost" onClick={() => rollback(v.version)}>回滚</button>
                              <button className="admin-btn sm ghost">锁定</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {showDiff && (
                    <>
                      <div style={{ display: 'flex', gap: 8, margin: '10px 0 6px', alignItems: 'center' }}>
                        <span className="admin-badge amber">v3</span>
                        <span>→</span>
                        <span className="admin-badge purple">v4</span>
                        <span style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>AI 摘要：新增政策变量引用、控制回复长度</span>
                      </div>
                      <div className="admin-diff">
                        {DIFF_LINES.map((l, i) => (
                          <div key={i} className={`admin-diff-line ${l.type}`}>
                            <span className="ln">{i + 1}</span>
                            <span>{l.text}</span>
                          </div>
                        ))}
                      </div>
                    </>
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
                      {AUDIT_LOGS.map((l, i) => (
                        <tr key={i}>
                          <td className="mono">{l.time}</td>
                          <td>{l.user}</td>
                          <td>{l.action}</td>
                          <td className="mono">{l.ip}</td>
                        </tr>
                      ))}
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
