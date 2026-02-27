import { create } from 'zustand'
import { api } from '@/lib/api'
import { FOOD_CATEGORY_ICONS } from '@/types'
import type {
  FoodItemResponse,
  CreateFoodItemInput,
  UpdateFoodItemInput,
} from '@/types'

interface FoodItemState {
  // compartmentId -> items 매핑
  items: Record<string, FoodItemResponse[]>
  loading: boolean
  error: string | null
}

interface FoodItemActions {
  fetchItems: (compartmentId: string) => Promise<void>
  createItem: (
    compartmentId: string,
    input: CreateFoodItemInput,
  ) => Promise<FoodItemResponse | null>
  updateItem: (
    itemId: string,
    compartmentId: string,
    input: UpdateFoodItemInput,
  ) => Promise<void>
  deleteItem: (itemId: string, compartmentId: string) => Promise<void>
  moveItem: (
    itemId: string,
    fromCompartmentId: string,
    toCompartmentId: string,
  ) => Promise<void>
  clearItems: () => void
}

type FoodItemStore = FoodItemState & FoodItemActions

export const useFoodItemStore = create<FoodItemStore>((set) => ({
  items: {},
  loading: false,
  error: null,

  fetchItems: async (compartmentId: string) => {
    set({ loading: true, error: null })
    try {
      const items = await api.get<FoodItemResponse[]>(
        `/compartments/${compartmentId}/food-items`,
      )
      set((state) => ({
        items: { ...state.items, [compartmentId]: items },
        loading: false,
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '식재료를 불러오지 못했습니다'
      set({ loading: false, error: message })
    }
  },

  createItem: async (compartmentId: string, input: CreateFoodItemInput) => {
    set({ loading: true, error: null })
    try {
      const item = await api.post<FoodItemResponse>(
        `/compartments/${compartmentId}/food-items`,
        input,
      )
      set((state) => ({
        items: {
          ...state.items,
          [compartmentId]: [...(state.items[compartmentId] ?? []), item],
        },
        loading: false,
      }))
      return item
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '식재료를 추가하지 못했습니다'
      set({ loading: false, error: message })
      return null
    }
  },

  updateItem: async (
    itemId: string,
    compartmentId: string,
    input: UpdateFoodItemInput,
  ) => {
    set({ error: null })
    try {
      const updated = await api.put<FoodItemResponse>(
        `/food-items/${itemId}`,
        input,
      )
      set((state) => ({
        items: {
          ...state.items,
          [compartmentId]: (state.items[compartmentId] ?? []).map((item) =>
            item.id === itemId ? updated : item,
          ),
        },
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '식재료를 수정하지 못했습니다'
      set({ error: message })
    }
  },

  deleteItem: async (itemId: string, compartmentId: string) => {
    set({ error: null })
    try {
      await api.delete(`/food-items/${itemId}`)
      set((state) => ({
        items: {
          ...state.items,
          [compartmentId]: (state.items[compartmentId] ?? []).filter(
            (item) => item.id !== itemId,
          ),
        },
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '식재료를 삭제하지 못했습니다'
      set({ error: message })
    }
  },

  moveItem: async (
    itemId: string,
    fromCompartmentId: string,
    toCompartmentId: string,
  ) => {
    set({ error: null })
    try {
      const moved = await api.patch<FoodItemResponse>(
        `/food-items/${itemId}/move`,
        {
          compartmentId: toCompartmentId,
        },
      )
      set((state) => ({
        items: {
          ...state.items,
          [fromCompartmentId]: (state.items[fromCompartmentId] ?? []).filter(
            (item) => item.id !== itemId,
          ),
          [toCompartmentId]: [...(state.items[toCompartmentId] ?? []), moved],
        },
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '식재료를 이동하지 못했습니다'
      set({ error: message })
    }
  },

  clearItems: () => {
    set({ items: {}, error: null })
  },
}))

// 카테고리 이모지 미리보기 (최대 3개 + 나머지 수)
export const getCategoryPreview = (
  items: FoodItemResponse[],
): { icons: string[]; extraCount: number } => {
  const allCategories = new Set(items.map((i) => i.category))
  const seen = new Set<string>()
  const icons: string[] = []
  for (const item of items) {
    const icon = FOOD_CATEGORY_ICONS[item.category]
    if (!seen.has(icon)) {
      seen.add(icon)
      icons.push(icon)
      if (icons.length >= 3) break
    }
  }
  return { icons, extraCount: Math.max(0, allCategories.size - icons.length) }
}
