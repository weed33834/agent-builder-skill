/**
 * SkillSidebar — ability library (deep-spec 15 H, SkillSidebar)
 * Three kinds: experts / skills / connectors.
 */
import { useEffect, useState } from 'react'
import type { SkillItem, SkillKind } from '../../types'
import { listSkills, updateSkill } from '../../l8_api/api'

const TABS: { key: SkillKind; label: string }[] = [
  { key: 'expert', label: '专家' },
  { key: 'skill', label: '技能' },
  { key: 'connector', label: '连接器' },
]

export function SkillSidebar({ onPick }: { onPick?: (s: SkillItem) => void }) {
  const [tab, setTab] = useState<SkillKind>('expert')
  const [items, setItems] = useState<SkillItem[]>([])

  const refresh = () => listSkills(tab).then(r => setItems(r.items)).catch(() => setItems([]))
  useEffect(() => { refresh() }, [tab])

  const toggle = async (s: SkillItem) => {
    await updateSkill(s.kind, s.id, { enabled: !s.enabled })
    refresh()
  }

  return (
    <div>
      <div className="skill-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`skill-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {items.map(s => (
        <div className="skill-item" key={s.id} onClick={() => onPick?.(s)}>
          <div className="skill-item-name">
            <span>{s.name}</span>
            <span className="skill-tag">{s.kind}</span>
          </div>
          <div className="skill-item-desc">{s.description}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ display: 'flex', gap: 4 }}>
              {(s.tags || []).map(t => <span key={t} className="skill-tag">{t}</span>)}
            </span>
            <label style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={!!s.enabled} onClick={e => { e.stopPropagation(); toggle(s) }} readOnly />
              启用
            </label>
          </div>
        </div>
      ))}
      {items.length === 0 && <div style={{ color: '#8a919c', fontSize: 12, textAlign: 'center', padding: 20 }}>该分类暂无条目</div>}
    </div>
  )
}
