import { create } from 'zustand'
import { api } from '@/lib/api'
import type { UserProfile } from '@monster-factory/shared'

interface UserState {
  user: UserProfile | null
  loading: boolean
  fetchUser: () => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,

  fetchUser: async () => {
    try {
      const user = await api.get<UserProfile>('/users/me')
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
