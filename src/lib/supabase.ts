/**
 * Supabase 客户端单例
 * 环境变量:
 *   VITE_SUPABASE_URL    — 项目 URL
 *   VITE_SUPABASE_ANON_KEY — 匿名 key
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})