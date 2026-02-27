import { create } from 'zustand'
import { api } from '@/lib/api'
import type { RecipeSuggestion, RecipeSuggestResponse } from '@/types'

interface RecipeState {
  recipes: RecipeSuggestion[]
  cached: boolean
  remainingCount: number
  isPremium: boolean
  loading: boolean
  error: string | null
}

interface CookCompleteResponse {
  deletedCount: number
  requestedCount: number
}

interface RemainingResponse {
  remainingCount: number
  isPremium: boolean
}

interface RecipeActions {
  fetchRemainingCount: () => Promise<void>
  suggestRecipes: (
    fridgeId: string,
    selectedItemIds?: string[],
  ) => Promise<void>
  cookComplete: (fridgeId: string, usedIngredients: string[]) => Promise<void>
  clearRecipes: () => void
}

type RecipeStore = RecipeState & RecipeActions

export const useRecipeStore = create<RecipeStore>((set) => ({
  recipes: [],
  cached: false,
  remainingCount: 2,
  isPremium: false,
  loading: false,
  error: null,

  fetchRemainingCount: async () => {
    try {
      const data = await api.get<RemainingResponse>('/usage/remaining')
      set({ remainingCount: data.remainingCount, isPremium: data.isPremium })
    } catch {
      // 실패 시 기본값 유지
    }
  },

  suggestRecipes: async (fridgeId: string, selectedItemIds?: string[]) => {
    set({ loading: true, error: null })
    try {
      const body = selectedItemIds ? { selectedItemIds } : undefined
      const data = await api.post<RecipeSuggestResponse>(
        `/fridges/${fridgeId}/recipe-suggest`,
        body,
      )
      set({
        recipes: data.recipes,
        cached: data.cached,
        remainingCount: data.remainingCount,
        loading: false,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '레시피 추천에 실패했습니다'
      set({ loading: false, error: message })
    }
  },

  cookComplete: async (fridgeId: string, usedIngredients: string[]) => {
    try {
      await api.post<CookCompleteResponse>(
        `/fridges/${fridgeId}/cook-complete`,
        {
          usedIngredients,
        },
      )
      set({ recipes: [], cached: false })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '요리 완료 처리에 실패했습니다'
      set({ error: message })
      throw err
    }
  },

  clearRecipes: () => {
    set({ recipes: [], cached: false, error: null })
  },
}))
