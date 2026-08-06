/**
 * 数据仓储层 —— 统一数据访问接口
 * 逐步替代直接 import 静态 TS 模块
 */
import { supabase } from '@/lib/supabase'

// ==================== 领域 ====================
export async function fetchDomains() {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .eq('available', true)
    .order('sort_order')
  if (error) throw error
  return data
}

// ==================== 测评 ====================
export async function fetchAssessments(domainId?: string) {
  let query = supabase
    .from('assessments')
    .select('*')
    .eq('is_published', true)
    .order('sort_order')
  if (domainId) query = query.eq('domain_id', domainId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchAssessmentBySlug(slug: string) {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

// ==================== 题目 ====================
export async function fetchQuestions(assessmentId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('sort_order')
  if (error) throw error
  return data
}

// ==================== 用户 ====================
export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ==================== 结果 ====================
export async function saveResult(result: {
  user_id: string
  assessment_id: string
  answers: unknown
  scores: unknown
  matches?: unknown
  conflicts?: unknown
  insights?: unknown
  summary?: unknown
  profile?: unknown
  duration_sec?: number
  is_public?: boolean
}) {
  const { data, error } = await supabase
    .from('results')
    .insert(result)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchUserResults(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('results')
    .select('*, assessments(title, slug, domain_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function fetchResultByShareToken(token: string) {
  const { data, error } = await supabase
    .from('results')
    .select('*, profiles(nickname, avatar_url), assessments(title, slug)')
    .eq('share_token', token)
    .single()
  if (error) throw error
  return data
}

// ==================== 每日内容 ====================
export async function fetchDailyQuote() {
  const { data, error } = await supabase
    .from('daily_quotes')
    .select('*')
    .eq('is_active', true)
    .limit(1)
  if (error) throw error
  // 随机选一条
  const quotes = data || []
  return quotes.length > 0 ? quotes[Math.floor(Math.random() * quotes.length)] : null
}

export async function fetchDailyEvents(monthDay: string) {
  const { data, error } = await supabase
    .from('daily_events')
    .select('*')
    .eq('month_day', monthDay)
    .eq('is_active', true)
    .order('year', { ascending: false })
  if (error) throw error
  return data || []
}

// ==================== 名人 ====================
export async function fetchFigures(limit = 50) {
  const { data, error } = await supabase
    .from('figures')
    .select('*')
    .eq('is_active', true)
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function fetchFigureBySlug(slug: string) {
  const { data, error } = await supabase
    .from('figures')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

// ==================== 社交 ====================
export async function fetchFriends(userId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, profiles!friendships_addressee_id_fkey(*)')
    .eq('requester_id', userId)
    .eq('status', 'accepted')
  if (error) throw error
  return data || []
}

export async function addFriend(requesterId: string, addresseeId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId })
    .select()
    .single()
  if (error) throw error
  return data
}

// ==================== 插件 ====================
export async function fetchPlugins() {
  const { data, error } = await supabase
    .from('plugins')
    .select('*')
    .eq('is_active', true)
    .order('install_count', { ascending: false })
  if (error) throw error
  return data || []
}

export async function installPlugin(userId: string, pluginId: string) {
  const { error } = await supabase
    .from('user_plugins')
    .insert({ user_id: userId, plugin_id: pluginId })
  if (!error) {
    // 更新安装计数
    await supabase.rpc('increment_plugin_install', { plugin_id: pluginId })
  }
  return { error }
}