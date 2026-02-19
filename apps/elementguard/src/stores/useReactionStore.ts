import { create } from 'zustand'
import type { ReactionType } from '@/types'

const STORAGE_KEY = 'elementguard-reactions'

const loadFromStorage = (): ReactionType[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const saveToStorage = (reactions: ReactionType[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions))
}

interface ReactionStoreState {
  discoveredReactions: ReactionType[]
}

interface ReactionStoreActions {
  discoverReaction: (type: ReactionType) => void
  isDiscovered: (type: ReactionType) => boolean
  reset: () => void
}

export const useReactionStore = create<ReactionStoreState & ReactionStoreActions>((set, get) => ({
  discoveredReactions: loadFromStorage(),

  discoverReaction: (type) => {
    const current = get().discoveredReactions
    if (current.includes(type)) return
    const updated = [...current, type]
    saveToStorage(updated)
    set({ discoveredReactions: updated })
  },

  isDiscovered: (type) => get().discoveredReactions.includes(type),

  reset: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ discoveredReactions: [] })
  },
}))
