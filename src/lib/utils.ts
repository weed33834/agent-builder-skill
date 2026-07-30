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
 * public/ 静态资源路径前缀:跟随 vite base(import.meta.env.BASE_URL)。
 * 本地 '/',GitHub Pages 等子路径托管 '/mindmirror/'。
 * 用于 TSX 中以字符串拼接的图片引用(CSS url() 由 Vite 自动 rebase,无需此函数)。
 * 已是绝对 URL(http(s)://、协议相对 //、data:/blob:)的路径原样返回,避免误改。
 */
export function asset(path: string): string {
  if (!path) return path
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path
}
