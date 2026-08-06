/**
 * Toast 通知 —— 使用 sonner 库。
 * 保持与原 toast(msg, kind) 签名兼容，内部映射到 sonner API。
 */
import { toast as sonnerToast } from 'sonner'

type ToastKind = 'info' | 'warn' | 'error'

export function toast(msg: string, kind: ToastKind = 'info'): void {
  switch (kind) {
    case 'error':
      sonnerToast.error(msg)
      break
    case 'warn':
      sonnerToast.warning(msg)
      break
    default:
      sonnerToast(msg)
  }
}