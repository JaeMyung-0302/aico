import { create } from 'zustand'
import { api } from '@/lib/api'
import type { CodexEntry } from '@monster-factory/shared'

interface CodexResponse {
  entries: CodexEntry[]
  discovered: number
  total: number
  completionRate: number
}

interface CodexState {
  entries: CodexEntry[]
  discovered: number
  total: number
  completionRate: number
  loading: boolean
  fetchCodex: () => Promise<void>
}

export const useCodexStore = create<CodexState>((set) => ({
  entries: [],
  discovered: 0,
  total: 0,
  completionRate: 0,
  loading: true,

  fetchCodex: async () => {
    try {
      const data = await api.get<CodexResponse>('/codex')
      set({
        entries: data.entries,
        discovered: data.discovered,
        total: data.total,
        completionRate: data.completionRate,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },
}))
