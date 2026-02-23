import { create } from 'zustand'
import type { User, Session, Subscription } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  readonly user: User | null
  readonly session: Session | null
  readonly loading: boolean
  readonly initialized: boolean
  readonly initialize: () => Promise<void>
  readonly signInWithGoogle: () => Promise<void>
  readonly signInWithKakao: () => Promise<void>
  readonly signOut: () => Promise<void>
  readonly dispose: () => void
}

let authSubscription: Subscription | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    try {
      // Supabase 연결 불가 시 무한 대기 방지 (5초 타임아웃)
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 5000),
      )
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
      set({ session, user: session?.user ?? null, loading: false, initialized: true })

      // 기존 구독 해제 후 새 구독 (HMR 대비)
      authSubscription?.unsubscribe()

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null })
      })
      authSubscription = subscription
    } catch {
      set({ loading: false, initialized: true })
    }
  },

  signInWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      // OAuth 리다이렉트 실패 시 무시 (브라우저 팝업 차단 등)
    }
  },

  signInWithKakao: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      // OAuth 리다이렉트 실패 시 무시
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // signOut 실패 시에도 로컬 상태 정리
    }
    set({ user: null, session: null })
  },

  dispose: () => {
    authSubscription?.unsubscribe()
    authSubscription = null
    set({ user: null, session: null, loading: true, initialized: false })
  },
}))
