import { create } from 'zustand'
import type { CharacterClass, PermanentStats } from '@soulblade/shared'
import { EMPTY_PERMANENT_STATS } from '@soulblade/shared'
import { supabase } from '@/lib/supabase'

interface CharacterState {
  readonly selectedClass: CharacterClass
  readonly permanentStats: PermanentStats
  readonly masteryLevel: number
  readonly masteryExp: number
  readonly loading: boolean
  readonly selectClass: (cls: CharacterClass) => void
  readonly fetchCharacter: (userId: string, cls: CharacterClass) => Promise<void>
  readonly saveCharacter: (userId: string) => Promise<void>
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  selectedClass: 'Warrior',
  permanentStats: { ...EMPTY_PERMANENT_STATS },
  masteryLevel: 0,
  masteryExp: 0,
  loading: false,

  selectClass: (cls) => set({ selectedClass: cls }),

  fetchCharacter: async (userId, cls) => {
    set({ loading: true })
    try {
      const { data } = await supabase
        .from('sb_characters')
        .select('*')
        .eq('user_id', userId)
        .eq('class_type', cls)
        .maybeSingle()

      if (data) {
        set({
          selectedClass: cls,
          permanentStats: {
            hp: data.permanent_hp,
            atk: data.permanent_atk,
            def: data.permanent_def,
            spd: data.permanent_spd,
            crit: data.permanent_crit,
          },
          masteryLevel: data.mastery_level,
          masteryExp: data.mastery_exp,
        })
      } else {
        set({
          selectedClass: cls,
          permanentStats: { ...EMPTY_PERMANENT_STATS },
          masteryLevel: 0,
          masteryExp: 0,
        })
      }
    } catch {
      // 캐릭터 미존재 시 기본값 유지
    } finally {
      set({ loading: false })
    }
  },

  saveCharacter: async (userId) => {
    const { selectedClass, permanentStats, masteryLevel, masteryExp } = get()
    const { error } = await supabase
      .from('sb_characters')
      .upsert({
        user_id: userId,
        class_type: selectedClass,
        permanent_hp: permanentStats.hp,
        permanent_atk: permanentStats.atk,
        permanent_def: permanentStats.def,
        permanent_spd: permanentStats.spd,
        permanent_crit: permanentStats.crit,
        mastery_level: masteryLevel,
        mastery_exp: masteryExp,
      }, { onConflict: 'user_id,class_type' })
    if (error) throw error
  },
}))
