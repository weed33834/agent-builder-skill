/**
 * Supabase 客户端单例
 * 环境变量:
 *   VITE_SUPABASE_URL    — 项目 URL
 *   VITE_SUPABASE_ANON_KEY — 匿名 key
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 未设置 — 认证功能不可用')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null