import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Monster } from '@monster-factory/shared'

interface PartyData {
  id: string
  userId: string
  slot1Id: string | null
  slot2Id: string | null
  slot3Id: string | null
  slot1: Monster | null
  slot2: Monster | null
  slot3: Monster | null
}

interface PartyState {
  party: PartyData | null
  loading: boolean
  fetchParty: () => Promise<void>
  updateParty: (slot1Id: string | null, slot2Id: string | null, slot3Id: string | null) => Promise<void>
}

export const usePartyStore = create<PartyState>((set) => ({
  party: null,
  loading: true,

  fetchParty: async () => {
    try {
      const party = await api.get<PartyData | null>('/party')
      set({ party, loading: false })
    } catch {
      set({ party: null, loading: false })
    }
  },

  updateParty: async (slot1Id, slot2Id, slot3Id) => {
    const party = await api.put<PartyData>('/party', { slot1Id, slot2Id, slot3Id })
    set({ party })
  },
}))
