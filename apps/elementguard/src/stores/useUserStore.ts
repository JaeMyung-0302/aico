import { create } from 'zustand'

interface UserState {
  userId: string | null
  displayName: string
  gel: number
  exp: number
  level: number
  isGuest: boolean
}

interface UserActions {
  setUser: (userId: string, displayName: string, isGuest: boolean, gel?: number, exp?: number, level?: number) => void
  addGel: (amount: number) => void
  addExp: (amount: number) => void
  reset: () => void
}

const initialState: UserState = {
  userId: null,
  displayName: 'Guest',
  gel: 0,
  exp: 0,
  level: 1,
  isGuest: true,
}

// 레벨업에 필요한 경험치
const getExpForLevel = (level: number): number => 100 * level

export const useUserStore = create<UserState & UserActions>((set) => ({
  ...initialState,
  setUser: (userId, displayName, isGuest, gel, exp, level) =>
    set({ userId, displayName, isGuest, gel: gel ?? 0, exp: exp ?? 0, level: level ?? 1 }),
  addGel: (amount) =>
    set((state) => ({ gel: Math.max(0, state.gel + amount) })),
  addExp: (amount) =>
    set((state) => {
      let newExp = state.exp + amount
      let newLevel = state.level
      let required = getExpForLevel(newLevel)

      while (newExp >= required) {
        newExp -= required
        newLevel++
        required = getExpForLevel(newLevel)
      }

      return { exp: newExp, level: newLevel }
    }),
  reset: () => set(initialState),
}))
