import { create } from 'zustand'
import api from '@/lib/api'
import type { User, QuotaStatus } from '@/types/user'

const API_URL = import.meta.env.VITE_API_URL || ''

interface AuthState {
  user: User | null
  isLoading: boolean
  quotaStatus: QuotaStatus | null
  initialize: () => Promise<void>
  fetchQuota: () => Promise<void>
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>
  signInWithKakao: () => void
  signInWithGoogle: () => void
  signOut: () => void
  setTokenAndFetchUser: (token: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  quotaStatus: null,

  initialize: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ user: null, isLoading: false })
      return
    }

    try {
      const { data } = await api.get<User>('/auth/me')
      set({ user: data, isLoading: false })
      get().fetchQuota()
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
    try {
      const { data } = await api.post<{ token: string }>('/auth/signup', {
        email,
        password,
      })
      localStorage.setItem('access_token', data.token)
      const { data: userData } = await api.get<User>('/auth/me')
      set({ user: userData })
      get().fetchQuota()
      return {}
    } catch (error: any) {
      return {
        error:
          error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      }
    }
  },

  signInWithEmail: async (email, password) => {
    try {
      const { data } = await api.post<{ token: string }>('/auth/signin', {
        email,
        password,
      })
      localStorage.setItem('access_token', data.token)
      const { data: userData } = await api.get<User>('/auth/me')
      set({ user: userData })
      get().fetchQuota()
      return {}
    } catch (error: any) {
      return {
        error:
          error.response?.data?.message ||
          '이메일 또는 비밀번호가 올바르지 않습니다.',
      }
    }
  },

  signInWithKakao: () => {
    window.location.href = `${API_URL}/api/v1/auth/kakao`
  },

  signInWithGoogle: () => {
    window.location.href = `${API_URL}/api/v1/auth/google`
  },

  signOut: () => {
    localStorage.removeItem('access_token')
    set({ user: null, quotaStatus: null })
  },

  setTokenAndFetchUser: async (token: string) => {
    localStorage.setItem('access_token', token)
    try {
      const { data } = await api.get<User>('/auth/me')
      set({ user: data, isLoading: false })
      get().fetchQuota()
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, isLoading: false })
    }
  },
}))
