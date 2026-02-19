import { create } from 'zustand'
import type { Equipment, EquipmentType } from '@soulblade/shared'
import { supabase } from '@/lib/supabase'

interface InventoryState {
  readonly items: readonly Equipment[]
  readonly loading: boolean
  readonly fetchInventory: (userId: string) => Promise<void>
  readonly equipItem: (itemId: string, characterId: string) => Promise<void>
  readonly unequipItem: (itemId: string) => Promise<void>
  readonly getEquippedItems: (characterId: string) => readonly Equipment[]
  readonly getEquippedBySlot: (characterId: string, slot: EquipmentType) => Equipment | undefined
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,

  fetchInventory: async (userId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('sb_equipment')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const items: Equipment[] = (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type as EquipmentType,
        grade: row.grade,
        name: row.name,
        tags: row.tags ?? [],
        stats: row.stats ?? {},
        weaponPower: row.weapon_power ?? 0,
        equippedBy: row.equipped_by,
      }))

      set({ items })
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

    // 같은 슬롯에 이미 장착된 장비가 있으면 해제
    const existingEquipped = items.find(
      (i) => i.equippedBy === characterId && i.type === item.type,
    )

    try {
      if (existingEquipped) {
        const { error } = await supabase
          .from('sb_equipment')
          .update({ equipped_by: null })
          .eq('id', existingEquipped.id)
        if (error) throw error
      }

      const { error } = await supabase
        .from('sb_equipment')
        .update({ equipped_by: characterId })
        .eq('id', itemId)
      if (error) throw error

      // 로컬 상태 업데이트 (불변)
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
      const userId = item.userId
      get().fetchInventory(userId)
    }
  },

  unequipItem: async (itemId) => {
    const { items } = get()
    try {
      const { error } = await supabase
        .from('sb_equipment')
        .update({ equipped_by: null })
        .eq('id', itemId)
      if (error) throw error

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
