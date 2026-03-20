import { create } from 'zustand'
import api from '@/lib/api'
import { isAxiosError } from 'axios'

interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, isLoading: false })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, isLoading: false })
    }
  },

  signUp: async (email, password, name) => {
    try {
      const { data } = await api.post('/auth/signup', { email, password, name })
      localStorage.setItem('access_token', data.token)
      const { data: user } = await api.get('/auth/me')
      set({ user })
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.response?.data?.message || '회원가입에 실패했습니다.')
      }
      throw error
    }
  },

  signIn: async (email, password) => {
    try {
      const { data } = await api.post('/auth/signin', { email, password })
      localStorage.setItem('access_token', data.token)
      const { data: user } = await api.get('/auth/me')
      set({ user })
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.response?.data?.message || '로그인에 실패했습니다.')
      }
      throw error
    }
  },

  signOut: () => {
    localStorage.removeItem('access_token')
    set({ user: null })
  },
}))
