import { create } from 'zustand'
import type { Equipment, EquipmentType } from '@soulblade/shared'
import { api } from '@/lib/api'

interface InventoryState {
  readonly items: readonly Equipment[]
  readonly loading: boolean
  readonly fetchInventory: () => Promise<void>
  readonly equipItem: (itemId: string, characterId: string) => Promise<void>
  readonly unequipItem: (itemId: string) => Promise<void>
  readonly getEquippedItems: (characterId: string) => readonly Equipment[]
  readonly getEquippedBySlot: (characterId: string, slot: EquipmentType) => Equipment | undefined
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,

  fetchInventory: async () => {
    set({ loading: true })
    try {
      const data = await api.get<Equipment[]>('/inventory')
      set({ items: data })
    } catch {
      // 에러 시 빈 목록 유지
    } finally {
      set({ loading: false })
    }
  },

  equipItem: async (itemId, characterId) => {
    const { items } = get()
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    try {
      await api.patch(`/inventory/${itemId}/equip`, { characterId })

      // 로컬 상태 업데이트 (불변)
      const existingEquipped = items.find(
        (i) => i.equippedBy === characterId && i.type === item.type,
      )

      set({
        items: items.map((i) => {
          if (existingEquipped && i.id === existingEquipped.id) {
            return { ...i, equippedBy: null }
          }
          if (i.id === itemId) {
            return { ...i, equippedBy: characterId }
          }
          return i
        }),
      })
    } catch {
      // 에러 시 refetch
      get().fetchInventory()
    }
  },

  unequipItem: async (itemId) => {
    const { items } = get()
    try {
      await api.patch(`/inventory/${itemId}/unequip`)

      set({
        items: items.map((i) =>
          i.id === itemId ? { ...i, equippedBy: null } : i,
        ),
      })
    } catch {
      // 에러 무시
    }
  },

  getEquippedItems: (characterId) => {
    return get().items.filter((i) => i.equippedBy === characterId)
  },

  getEquippedBySlot: (characterId, slot) => {
    return get().items.find(
      (i) => i.equippedBy === characterId && i.type === slot,
    )
  },
}))
