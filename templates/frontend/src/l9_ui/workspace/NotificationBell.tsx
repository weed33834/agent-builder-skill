/**
 * NotificationBell — notification center (deep-spec 15 NotificationBell)
 * Dropdown with unread badge, mark-read and real-time refresh.
 */
import { useEffect, useRef, useState } from 'react'
import type { AppNotification } from '../../types'
import { listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../l8_api/api'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const refresh = () => {
    listNotifications().then(r => setItems(r.items)).catch(() => setItems([]))
    getUnreadCount().then(r => setUnread(r.unread)).catch(() => {})
  }
  useEffect(refresh, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const read = async (n: AppNotification) => {
    if (!n.read) { await markNotificationRead(n.id); refresh() }
  }

  return (
    <div className="notif-bell" ref={ref}>
      <button className="btn" onClick={() => { setOpen(o => !o); refresh() }} style={{ position: 'relative' }}>
        🔔
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="workspace-pane-head">
            <span className="workspace-pane-title">通知中心</span>
            <button className="btn sm" onClick={async () => { await markAllNotificationsRead(); refresh() }}>全部已读</button>
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            {items.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => read(n)}>
                <span className={`notif-level ${n.level}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 11.5, color: '#8a919c' }}>{n.body}</div>}
                  <div style={{ fontSize: 10.5, color: '#b0b6bf', marginTop: 2 }}>{n.module}</div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div style={{ textAlign: 'center', color: '#8a919c', padding: 20, fontSize: 12 }}>暂无通知</div>}
          </div>
        </div>
      )}
    </div>
  )
}
