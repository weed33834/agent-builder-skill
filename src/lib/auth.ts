/**
 * 认证 Hook —— 封装 Supabase Auth 完整生命周期
 */
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuthStore } from '@/store/authStore'
import type { Provider } from '@supabase/supabase-js'

export function useAuth() {
  const { user, session, loading, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  // 初始化: 监听认证状态
  useEffect(() => {
    if (!supabase) {
      clearAuth()
      return
    }
    // 获取当前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session)
    })

    // 监听 auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session)
    })

    return () => subscription.unsubscribe()
  }, [setAuth, clearAuth])

  // 邮箱密码登录
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase 未配置') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  // 注册
  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    if (!supabase) return { error: new Error('Supabase 未配置') }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nickname || email.split('@')[0] },
      },
    })
    return { error }
  }, [])

  // OAuth 登录
  const signInWithProvider = useCallback(async (provider: Provider) => {
    if (!supabase) return { error: new Error('Supabase 未配置') }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    return { error }
  }, [])

  // 退出
  const signOut = useCallback(async () => {
    if (!supabase) { clearAuth(); navigate('/'); return }
    await supabase.auth.signOut()
    clearAuth()
    navigate('/')
  }, [clearAuth, navigate])

  // 重置密码
  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: new Error('Supabase 未配置') }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    return { error }
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    resetPassword,
  }
}