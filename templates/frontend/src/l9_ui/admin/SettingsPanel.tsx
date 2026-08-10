/**
 * 系统设置页面（M7.26）
 *
 * 布局：分组设置面板（应用 / 界面 / 安全 / 集成）+ 保存。
 * - GET /api/admin/settings → 当前配置
 * - PUT /api/admin/settings → 保存配置（热加载）
 */

import { useState } from 'react'
import { adminGetSettings, adminUpdateSettings, adminExportBackup, adminRestoreBackup } from '../../l8_api/api'

export function SettingsPanel() {
  const [form, setForm] = useState({
    app_name: 'AI Engineer Agent',
    lang: 'zh-CN',
    theme: 'dark',
    default_model: '',
    max_tokens: 4096,
  })
  const [notice, setNotice] = useState('')
  const [backupJson, setBackupJson] = useState('')

  const refresh = async () => {
    try {
      const data = await adminGetSettings()
      setForm({
        app_name: String((data.app as Record<string, unknown>)?.name ?? 'Agent'),
        lang: String((data.app as Record<string, unknown>)?.lang ?? 'zh-CN'),
        theme: String((data.app as Record<string, unknown>)?.theme ?? 'dark'),
        default_model: String((data.model as Record<string, unknown>)?.default ?? ''),
        max_tokens: Number((data.model as Record<string, unknown>)?.max_tokens ?? 4096),
      })
    } catch {
      /* 后端未就绪 */
    }
  }
  void refresh()

  const save = async () => {
    try {
      await adminUpdateSettings({
        app: { name: form.app_name, lang: form.lang, theme: form.theme },
        model: { default: form.default_model, max_tokens: form.max_tokens },
      })
      setNotice('设置已保存（热加载生效）')
    } catch (e) {
      setNotice(`保存失败: ${String(e)}`)
    }
  }

  return (
    <div className="admin-panel" data-testid="admin-settings">
      <h3>应用设置</h3>
      <div className="form-grid">
        <label>
          应用名称
          <input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} />
        </label>
        <label>
          语言
          <select value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value })}>
            {['zh-CN', 'en-US', 'ja-JP'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          主题
          <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            {['dark', 'light', 'auto'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <h3>模型设置</h3>
      <div className="form-grid">
        <label>
          默认模型
          <input
            value={form.default_model}
            onChange={(e) => setForm({ ...form, default_model: e.target.value })}
            placeholder="gpt-4o / claude-sonnet-4 / gemini-2.0-flash …"
          />
        </label>
        <label>
          最大 Token
          <input
            type="number"
            value={form.max_tokens}
            onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="admin-actions">
        <button className="btn-primary" onClick={save}>保存设置</button>
      </div>
      {notice && <p className="admin-notice">{notice}</p>}

      <h3>备份 / 迁移（M13）</h3>
      <div className="form-grid">
        <label className="span-2">
          导出当前全部配置（提示词/模型/工具/Agent/记忆/编排/告警/权限等）
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  const bundle = await adminExportBackup()
                  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = `agent-builder-backup-${Date.now()}.json`
                  a.click()
                  URL.revokeObjectURL(a.href)
                  setNotice('备份已导出')
                } catch (e) {
                  setNotice(`导出失败: ${String(e)}`)
                }
              }}
            >
              ⬇ 导出备份
            </button>
          </div>
        </label>
        <label className="span-2">
          从备份恢复（粘贴导出的 JSON）
          <textarea
            rows={4}
            value={backupJson}
            onChange={e => setBackupJson(e.target.value)}
            placeholder="粘贴备份 JSON…"
            style={{ fontFamily: 'var(--admin-mono)', fontSize: 11.5 }}
          />
        </label>
      </div>
      <div className="admin-actions">
        <button
          className="btn-primary"
          disabled={!backupJson.trim()}
          onClick={async () => {
            try {
              const bundle = JSON.parse(backupJson)
              const res = await adminRestoreBackup(bundle)
              setNotice(`已恢复 ${res.restored} 个配置集合`)
            } catch (e) {
              setNotice(`恢复失败: ${String(e)}`)
            }
          }}
        >
          ⬆ 恢复备份
        </button>
      </div>
    </div>
  )
}
