/**
 * L9 - Security & IAM admin page (full-spec M11)
 *
 * Users / API Keys / Permission matrix / Audit log.
 * Backs onto /api/admin/security/*.
 */

import { useEffect, useState } from 'react'
import {
  adminListUsers, adminCreateUser, adminUpdateUser, adminDeleteUser,
  adminListAPIKeys, adminCreateAPIKey, adminRevokeAPIKey, adminGetAuditLog,
} from '../../l8_api/api'

interface User { id: string; username: string; email: string; role: string; status: string; created_at: number }
interface ApiKey { id: string; name: string; key: string; scope: string; status: string; created_at: number }
interface AuditEntry { ts: number; action: string; subject: string; detail?: string }

const ROLES = ['admin', 'developer', 'viewer']
const PERMISSION_MATRIX = [
  { module: 'prompts', label: '提示词', roles: ['admin', 'developer', 'viewer'] },
  { module: 'models', label: '模型', roles: ['admin', 'developer'] },
  { module: 'tools', label: '工具', roles: ['admin', 'developer'] },
  { module: 'agents', label: 'Agent', roles: ['admin', 'developer', 'viewer'] },
  { module: 'memory', label: '记忆', roles: ['admin', 'developer'] },
  { module: 'workflows', label: '编排', roles: ['admin', 'developer'] },
  { module: 'evaluations', label: '评估', roles: ['admin', 'developer', 'viewer'] },
  { module: 'monitoring', label: '监控', roles: ['admin', 'viewer'] },
  { module: 'security', label: '权限安全', roles: ['admin'] },
  { module: 'settings', label: '系统设置', roles: ['admin'] },
]

export function SecurityPanel() {
  const [tab, setTab] = useState<'users' | 'keys' | 'permissions' | 'audit'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [newUser, setNewUser] = useState({ username: '', email: '', role: 'viewer' })
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [matrix, setMatrix] = useState<Record<string, string[]>>({})

  const loadUsers = () => adminListUsers().then(r => setUsers(r.items as unknown as User[])).catch(() => {})
  const loadKeys = () => adminListAPIKeys().then(r => setKeys(r.items as unknown as ApiKey[])).catch(() => {})
  const loadAudit = () => adminGetAuditLog().then(r => setAudit(r.items as unknown as AuditEntry[])).catch(() => {})

  useEffect(() => {
    loadUsers(); loadKeys(); loadAudit()
  }, [])

  const handleCreateUser = async () => {
    if (!newUser.username) return
    await adminCreateUser(newUser)
    setNewUser({ username: '', email: '', role: 'viewer' })
    loadUsers()
  }

  const handleCreateKey = async () => {
    const res = await adminCreateAPIKey({ name: newKeyName || 'default' })
    setGeneratedKey(res.key)
    setNewKeyName('')
    loadKeys()
  }

  const fmtTime = (ts: number) => new Date(ts * 1000).toLocaleString('zh-CN')

  return (
    <div className="admin-stack">
      <div className="admin-tabs">
        {(['users', 'keys', 'permissions', 'audit'] as const).map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'users' ? '👤 用户管理' : t === 'keys' ? '🔑 API Key' : t === 'permissions' ? '🛡️ 权限矩阵' : '📋 审计日志'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">用户列表</span>
            <span className="admin-card-sub">新增/邀请 / 角色分配</span>
          </div>
          <div className="admin-card-body">
            <div className="admin-inline-form">
              <input placeholder="用户名" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
              <input placeholder="邮箱" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="admin-btn primary" onClick={handleCreateUser}>+ 邀请用户</button>
            </div>
            <table className="admin-table">
              <thead>
                <tr><th>用户名</th><th>邮箱</th><th>角色</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <select value={u.role} onChange={e => { adminUpdateUser(u.id, { role: e.target.value }); loadUsers() }}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>{u.status}</td>
                    <td>
                      <button className="admin-btn danger sm" onClick={() => adminDeleteUser(u.id).then(loadUsers)}>删除</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="admin-empty">暂无用户</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'keys' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">API Key 管理</span>
            <span className="admin-card-sub">生成 / 吊销（自动化 CI 长期凭证）</span>
          </div>
          <div className="admin-card-body">
            <div className="admin-inline-form">
              <input placeholder="Key 名称（如 CI 流水线）" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
              <button className="admin-btn primary" onClick={handleCreateKey}>+ 生成 Key</button>
            </div>
            {generatedKey && (
              <div className="admin-code-block">
                新 Key（仅显示一次，请妥善保存）：<code>{generatedKey}</code>
                <button className="admin-btn sm" onClick={() => navigator.clipboard?.writeText(generatedKey)}>复制</button>
              </div>
            )}
            <table className="admin-table">
              <thead><tr><th>名称</th><th>Key</th><th>范围</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td><code>{k.key.slice(0, 12)}…</code></td>
                    <td>{k.scope}</td>
                    <td>{k.status}</td>
                    <td>
                      {k.status === 'active' &&
                        <button className="admin-btn danger sm" onClick={() => adminRevokeAPIKey(k.id).then(loadKeys)}>吊销</button>}
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && <tr><td colSpan={5} className="admin-empty">暂无 Key</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'permissions' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">权限矩阵</span>
            <span className="admin-card-sub">模块 × 角色（勾选可访问角色）</span>
          </div>
          <div className="admin-card-body">
            <table className="admin-table">
              <thead><tr><th>模块</th>{ROLES.map(r => <th key={r}>{r}</th>)}</tr></thead>
              <tbody>
                {PERMISSION_MATRIX.map(row => (
                  <tr key={row.module}>
                    <td>{row.label}</td>
                    {ROLES.map(r => (
                      <td key={r}>
                        <input type="checkbox" checked={matrix[row.module]?.includes(r) ?? row.roles.includes(r)} onChange={e => {
                          const current = new Set(matrix[row.module] ?? row.roles)
                          if (e.target.checked) current.add(r); else current.delete(r)
                          setMatrix(prev => ({ ...prev, [row.module]: Array.from(current) }))
                        }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-actions">
              <button className="admin-btn primary" onClick={() => console.log('saving permission matrix', matrix)}>保存（本地示意）</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">审计日志</span>
            <span className="admin-card-sub">最近 500 条配置变更</span>
          </div>
          <div className="admin-card-body">
            <table className="admin-table">
              <thead><tr><th>时间</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td>{fmtTime(a.ts)}</td>
                    <td><code>{a.action}</code></td>
                    <td>{a.subject}</td>
                    <td>{a.detail || ''}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={4} className="admin-empty">暂无审计记录</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityPanel
