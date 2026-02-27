import { create } from 'zustand'
import { api } from '@/lib/api'
import type {
  FridgeResponse,
  CreateFridgeInput,
  UpdateFridgeInput,
  UpdateCompartmentsInput,
} from '@/types'

interface FridgeState {
  fridges: FridgeResponse[]
  activeFridgeId: string | null
  loading: boolean
  initialLoaded: boolean
  error: string | null
}

interface FridgeActions {
  fetchFridges: () => Promise<void>
  createFridge: (input: CreateFridgeInput) => Promise<FridgeResponse | null>
  updateFridge: (id: string, input: UpdateFridgeInput) => Promise<void>
  updateCompartments: (
    fridgeId: string,
    input: UpdateCompartmentsInput,
  ) => Promise<FridgeResponse | null>
  deleteFridge: (id: string) => Promise<void>
  setActiveFridge: (id: string) => void
}

type FridgeStore = FridgeState & FridgeActions

export const useFridgeStore = create<FridgeStore>((set, get) => ({
  fridges: [],
  activeFridgeId: null,
  loading: false,
  initialLoaded: false,
  error: null,

  fetchFridges: async () => {
    if (!get().initialLoaded) {
      set({ loading: true, error: null })
    } else {
      set({ error: null })
    }
    try {
      const fridges = await api.get<FridgeResponse[]>('/fridges')
      const currentActive = get().activeFridgeId
      set({
        fridges,
        loading: false,
        initialLoaded: true,
        // 활성 냉장고가 없으면 첫 번째 냉장고를 선택
        activeFridgeId:
          currentActive && fridges.some((f) => f.id === currentActive)
            ? currentActive
            : (fridges[0]?.id ?? null),
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '냉장고 목록을 불러오지 못했습니다'
      set({ loading: false, error: message })
    }
  },

  createFridge: async (input: CreateFridgeInput) => {
    set({ loading: true, error: null })
    try {
      const fridge = await api.post<FridgeResponse>('/fridges', input)
      set((state) => ({
        fridges: [...state.fridges, fridge],
        activeFridgeId: fridge.id,
        loading: false,
      }))
      return fridge
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '냉장고를 추가하지 못했습니다'
      set({ loading: false, error: message })
      return null
    }
  },

  updateFridge: async (id: string, input: UpdateFridgeInput) => {
    set({ error: null })
    try {
      const updated = await api.put<FridgeResponse>(`/fridges/${id}`, input)
      set((state) => ({
        fridges: state.fridges.map((f) => (f.id === id ? updated : f)),
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '냉장고 정보를 수정하지 못했습니다'
      set({ error: message })
    }
  },

  updateCompartments: async (
    fridgeId: string,
    input: UpdateCompartmentsInput,
  ) => {
    set({ error: null })
    try {
      const updated = await api.put<FridgeResponse>(
        `/fridges/${fridgeId}/compartments`,
        input,
      )
      set((state) => ({
        fridges: state.fridges.map((f) => (f.id === fridgeId ? updated : f)),
      }))
      return updated
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '칸 구성을 수정하지 못했습니다'
      set({ error: message })
      return null
    }
  },

  deleteFridge: async (id: string) => {
    set({ error: null })
    try {
      await api.delete(`/fridges/${id}`)
      set((state) => {
        const fridges = state.fridges.filter((f) => f.id !== id)
        return {
          fridges,
          activeFridgeId:
            state.activeFridgeId === id
              ? (fridges[0]?.id ?? null)
              : state.activeFridgeId,
        }
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '냉장고를 삭제하지 못했습니다'
      set({ error: message })
    }
  },

  setActiveFridge: (id: string) => {
    set({ activeFridgeId: id })
  },
}))
