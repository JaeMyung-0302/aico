import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  readonly user: User | null
  readonly session: Session | null
  readonly loading: boolean
  readonly initialized: boolean
  readonly initialize: () => Promise<void>
  readonly signInWithGoogle: () => Promise<void>
  readonly signInAsGuest: () => Promise<void>
  readonly signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    // 중복 호출 방지 (StrictMode double-mount 대응)
    if (get().initialized) return

    if (!supabase) {
      // 오프라인 모드: Supabase 미설정 시 로딩 해제
      set({ loading: false, initialized: true })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null, loading: false, initialized: true })

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null })
      })
    } catch {
      set({ loading: false, initialized: true })
    }
  },

  signInWithGoogle: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  },

  signInAsGuest: async () => {
    if (!supabase) return
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    set({ session: data.session, user: data.user })
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
