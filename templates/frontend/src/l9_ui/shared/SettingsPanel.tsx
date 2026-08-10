/**
 * L9 - Settings Panel (M8 配置面板)
 *
 * Edits agent runtime configuration through the L8 /api/config endpoints:
 * - LLM provider / model / temperature
 * - Memory type
 * - Rate limiting toggle
 * Mirrors backend l10_infra/config.py Settings fields.
 */

import { useEffect, useState } from 'react'
import { getAgentConfig, updateAgentConfig } from '../../l8_api/api'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAgentConfig().then((c) => setConfig(c as unknown as Record<string, unknown>)).catch(() => {})
  }, [])

  const set = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...(prev ?? {}), [key]: value }))
  }

  const save = async () => {
    if (!config) return
    setError(null)
    try {
      await updateAgentConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setError('保存失败')
    }
  }

  if (!config) {
    return (
      <div className="settings-panel">
        <div className="settings-header">
          <h3>Agent 配置</h3>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <p className="settings-loading">加载中…</p>
      </div>
    )
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Agent 配置</h3>
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-body">
        <label className="settings-field">
          <span>LLM Provider</span>
          <select
            value={String(config.llm_provider ?? 'openai')}
            onChange={(e) => set('llm_provider', e.target.value)}
          >
            {['openai', 'anthropic', 'deepseek', 'ollama', 'gemini', 'qwen', 'glm', 'kimi'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>Model</span>
          <input
            type="text"
            value={String(config.llm_model ?? '')}
            onChange={(e) => set('llm_model', e.target.value)}
            placeholder="gpt-4o / gemini-2.5-flash / qwen-plus …"
          />
        </label>

        <label className="settings-field">
          <span>Temperature</span>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={Number(config.llm_temperature ?? 0.7)}
            onChange={(e) => set('llm_temperature', Number(e.target.value))}
          />
        </label>

        <label className="settings-field">
          <span>Memory Type</span>
          <select
            value={String(config.memory_type ?? 'buffer')}
            onChange={(e) => set('memory_type', e.target.value)}
          >
            {['buffer', 'summary', 'rag', 'hybrid'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="settings-field checkbox">
          <input
            type="checkbox"
            checked={Boolean(config.rate_limit_enabled)}
            onChange={(e) => set('rate_limit_enabled', e.target.checked)}
          />
          <span>启用限流 (RATE_LIMIT_ENABLED)</span>
        </label>
      </div>

      <div className="settings-footer">
        {error && <span className="settings-error">{error}</span>}
        {saved && <span className="settings-saved">✓ 已保存</span>}
        <button className="settings-save" onClick={save}>保存</button>
      </div>
    </div>
  )
}
