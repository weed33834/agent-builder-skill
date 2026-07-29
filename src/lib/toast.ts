/**
 * 通用 Toast —— 移植自原 app.js mmUI.toast。
 * 沉浸式不打断反馈(替代 alert),3 秒自动消失,样式走 orig-styles.css 的 .mm-toast*。
 */
type ToastKind = 'info' | 'warn' | 'error'

export function toast(msg: string, kind: ToastKind = 'info'): void {
  if (typeof document === 'undefined') return
  let host = document.getElementById('mm-toast-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'mm-toast-host'
    host.className = 'mm-toast-host'
    host.setAttribute('role', 'status')
    host.setAttribute('aria-live', 'polite')
    document.body.appendChild(host)
  }
  const el = document.createElement('div')
  el.className = `mm-toast mm-toast-${kind}`
  el.textContent = msg
  host.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, 3200)
}
