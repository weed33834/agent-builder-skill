import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * shadcn/ui 标准的 className 合并工具。
 * clsx 处理条件类名,twMerge 解决 Tailwind 类冲突(后者覆盖前者)。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * id 比较统一转字符串,避免 YAML '1'(字符串) vs 数字 的坑。
 * 从原 scoring.js strEq 迁移。
 */
export function strEq(a: unknown, b: unknown): boolean {
  return String(a) === String(b)
}

/**
 * 安全截断(避免切断多字节字符)。从原 scoring.js truncate 迁移。
 */
export function truncate(text: string | null | undefined, maxLen = 24): string {
  if (!text || text.length <= maxLen) return text || ''
  return text.slice(0, maxLen) + '…'
}

/**
 * 静态资源路径:使用 jsDelivr CDN 加速。
 * 已有绝对 URL 原样返回,否则拼接 CDN 地址。
 * 注:CSS url() 由 Vite 自动处理,无需此函数。
 */
export function asset(path: string): string {
  if (!path) return path
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  // 使用 jsDelivr CDN 加速资源加载
  const base = 'https://cdn.jsdelivr.net/gh/weed33834/mindmirror@main/public'
  return base + path
}
