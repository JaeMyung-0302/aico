import { create } from 'zustand'
import { api } from '@/lib/api'
import type { RecipeSuggestion, RecipeSuggestResponse } from '@/types'

interface RecipeState {
  recipes: RecipeSuggestion[]
  cached: boolean
  remainingCount: number
  loading: boolean
  error: string | null
}

interface CookCompleteResponse {
  deletedCount: number
  requestedCount: number
}

interface RecipeActions {
  suggestRecipes: (fridgeId: string) => Promise<void>
  cookComplete: (fridgeId: string, usedIngredients: string[]) => Promise<void>
  clearRecipes: () => void
}

type RecipeStore = RecipeState & RecipeActions

export const useRecipeStore = create<RecipeStore>((set) => ({
  recipes: [],
  cached: false,
  remainingCount: 2,
  loading: false,
  error: null,

  suggestRecipes: async (fridgeId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.post<RecipeSuggestResponse>(`/fridges/${fridgeId}/recipe-suggest`)
      set({
        recipes: data.recipes,
        cached: data.cached,
        remainingCount: data.remainingCount,
        loading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '레시피 추천에 실패했습니다'
      set({ loading: false, error: message })
    }
  },

  cookComplete: async (fridgeId: string, usedIngredients: string[]) => {
    try {
      await api.post<CookCompleteResponse>(`/fridges/${fridgeId}/cook-complete`, { usedIngredients })
      set({ recipes: [], cached: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : '요리 완료 처리에 실패했습니다'
      set({ error: message })
      throw err
    }
  },

  clearRecipes: () => {
    set({ recipes: [], cached: false, error: null })
  },
}))
