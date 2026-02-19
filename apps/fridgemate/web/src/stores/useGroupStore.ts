import { create } from 'zustand'
import { api } from '@/lib/api'
import type { GroupResponse } from '@/types'

const STORAGE_KEY = 'fridgemate-group-id'
const STORAGE_NAME_KEY = 'fridgemate-group-name'

interface GroupState {
  groupId: string | null
  groupName: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

interface GroupActions {
  verify: (code: string) => Promise<boolean>
  logout: () => void
}

type GroupStore = GroupState & GroupActions

const initialGroupId = localStorage.getItem(STORAGE_KEY)
const initialGroupName = localStorage.getItem(STORAGE_NAME_KEY)

export const useGroupStore = create<GroupStore>((set) => ({
  groupId: initialGroupId,
  groupName: initialGroupName,
  isAuthenticated: !!initialGroupId,
  loading: false,
  error: null,

  verify: async (code: string) => {
    set({ loading: true, error: null })
    try {
      const group = await api.post<GroupResponse>('/auth/verify', { code })
      localStorage.setItem(STORAGE_KEY, group.id)
      localStorage.setItem(STORAGE_NAME_KEY, group.name)
      set({
        groupId: group.id,
        groupName: group.name,
        isAuthenticated: true,
        loading: false,
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '인증에 실패했습니다'
      set({ loading: false, error: message })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_NAME_KEY)
    set({
      groupId: null,
      groupName: null,
      isAuthenticated: false,
      error: null,
    })
  },

}))
