import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import type { User, QuotaStatus } from '@/types/user'

interface AuthState {
  user: User | null
  isLoading: boolean
  quotaStatus: QuotaStatus | null
  _unsubscribe: (() => void) | null
  initialize: () => Promise<void>
  fetchQuota: () => Promise<void>
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ needsConfirmation: boolean; error?: string }>
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>
  signInWithKakao: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  quotaStatus: null,
  _unsubscribe: null,

  initialize: async () => {
    if (!supabase) {
      set({ user: null, isLoading: false })
      return
    }

    // 기존 리스너 해제 (다중 호출 시 누적 방지)
    const prev = get()._unsubscribe
    if (prev) prev()

    // 토큰 갱신·세션 종료 시 localStorage + 상태 동기화
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('access_token', session.access_token)
      } else {
        localStorage.removeItem('access_token')
        set({ user: null, quotaStatus: null, isLoading: false })
      }
    })
    set({ _unsubscribe: () => subscription.unsubscribe() })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        localStorage.setItem('access_token', session.access_token)
        const { data } = await api.get<User>('/auth/me')
        set({ user: data, isLoading: false })
        get().fetchQuota()
      } else {
        localStorage.removeItem('access_token')
        set({ user: null, isLoading: false })
      }
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, isLoading: false })
    }
  },

  fetchQuota: async () => {
    try {
      const { data } = await api.get<QuotaStatus>('/users/me/quota')
      set({ quotaStatus: data })
    } catch {
      set({ quotaStatus: null })
    }
  },

  signUpWithEmail: async (email, password) => {
    if (!supabase)
      return {
        needsConfirmation: false,
        error: '인증 서비스가 설정되지 않았습니다.',
      }
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) return { needsConfirmation: false, error: error.message }
      return { needsConfirmation: true }
    } catch {
      return {
        needsConfirmation: false,
        error: '회원가입 중 오류가 발생했습니다.',
      }
    }
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return { error: '인증 서비스가 설정되지 않았습니다.' }
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return {
            error: '이메일 인증을 완료해주세요. 받은편지함을 확인해주세요.',
          }
        }
        return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
      }
      if (authData.session) {
        localStorage.setItem('access_token', authData.session.access_token)
        const { data: userData } = await api.get<User>('/auth/me')
        set({ user: userData })
        get().fetchQuota()
      }
      return {}
    } catch {
      return { error: '로그인 중 오류가 발생했습니다.' }
    }
  },

  signInWithKakao: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin },
    })
  },

  signInWithGoogle: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    localStorage.removeItem('access_token')
    set({ user: null, quotaStatus: null })
  },
}))
