import AsyncStorage from '@react-native-async-storage/async-storage'
import { z } from 'zod'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

export const UPLOAD_QUEUE_STORAGE_KEY = 'media:upload-queue'

// RETRYABLE 만 "다시 올리기"로 되돌린다. 나머지는 다시 해도 같은 결과(20장 초과·사라진 사진·형식)
const uploadFailureSchema = z.enum(['RETRYABLE', 'PHOTO_LIMIT', 'UNSUPPORTED', 'GONE', 'INVALID'])
export type UploadFailure = z.infer<typeof uploadFailureSchema>

const uploadStatusSchema = z.enum(['queued', 'uploading', 'done', 'failed'])
export type UploadStatus = z.infer<typeof uploadStatusSchema>

// 기기 저장소에는 자산 id 와 단계만 둔다 — 사진 경로·촬영 위치·서명 URL 은 올릴 때 다시 읽는다
const uploadItemSchema = z.object({
  key: z.string(),
  entryId: z.string(),
  assetId: z.string(),
  status: uploadStatusSchema,
  failure: uploadFailureSchema.nullable(),
  photoId: z.string().nullable(),
  isDisplayUploaded: z.boolean(),
  isOriginalUploaded: z.boolean(),
})
export type UploadItem = z.infer<typeof uploadItemSchema>

export type UploadPatch = Partial<Omit<UploadItem, 'key' | 'entryId' | 'assetId'>>

// 과거 사진 일괄 등록 한 번의 범위(진행률 = 이 key 들 중 완료 수)
const bulkImportSchema = z.object({ keys: z.array(z.string()) })
export type BulkImportSession = z.infer<typeof bulkImportSchema>

const persistedSchema = z.object({
  items: z.array(uploadItemSchema),
  isPaused: z.boolean(),
  bulk: bulkImportSchema.nullable(),
})
type PersistedQueue = z.infer<typeof persistedSchema>

export type UploadQueueState = PersistedQueue & {
  hasHydrated: boolean
  // 넣은(또는 이미 있던) key 목록을 순서대로 돌려준다
  enqueue: (entryId: string, assetIds: readonly string[]) => string[]
  update: (key: string, patch: UploadPatch) => void
  retryFailed: (entryId?: string) => void
  requeueInFlight: () => void
  removeEntry: (entryId: string) => void
  setPaused: (isPaused: boolean) => void
  startBulk: (keys: readonly string[]) => void
  finishBulk: () => void
  reset: () => void
}

const EMPTY: PersistedQueue = { items: [], isPaused: false, bulk: null }

export const uploadKey = (entryId: string, assetId: string): string => `${entryId}:${assetId}`

const newItem = (entryId: string, assetId: string): UploadItem => ({
  key: uploadKey(entryId, assetId),
  entryId,
  assetId,
  status: 'queued',
  failure: null,
  photoId: null,
  isDisplayUploaded: false,
  isOriginalUploaded: false,
})

// 진행률(0~1): 업로드 발급 0.1 → 표시용 0.3 → 원본 0.5 → complete 0.1
export const uploadProgress = (item: UploadItem): number => {
  if (item.status === 'done') return 1
  return (item.photoId ? 0.1 : 0) + (item.isDisplayUploaded ? 0.3 : 0) + (item.isOriginalUploaded ? 0.5 : 0)
}

const toQueued = (item: UploadItem): UploadItem =>
  item.status === 'uploading' ? { ...item, status: 'queued' } : item

// 저장소 값은 믿지 않는다: 형식이 다르면 빈 목록, 올리던 중 종료된 항목은 대기로
const restore = (persisted: unknown): PersistedQueue => {
  const parsed = persistedSchema.safeParse(persisted)
  if (!parsed.success) return EMPTY
  return { ...parsed.data, items: parsed.data.items.map(toQueued) }
}

export const createUploadQueueStore = () => {
  const store = createStore<UploadQueueState>()(
    persist(
      (set, get) => ({
        ...EMPTY,
        hasHydrated: false,
        enqueue: (entryId, assetIds) => {
          const existing = new Set(get().items.map((item) => item.key))
          const added = [...new Set(assetIds)]
            .filter((assetId) => !existing.has(uploadKey(entryId, assetId)))
            .map((assetId) => newItem(entryId, assetId))
          if (added.length > 0) set({ items: [...get().items, ...added] })
          return assetIds.map((assetId) => uploadKey(entryId, assetId))
        },
        update: (key, patch) =>
          set({ items: get().items.map((item) => (item.key === key ? { ...item, ...patch } : item)) }),
        retryFailed: (entryId) =>
          set({
            items: get().items.map((item) =>
              item.status === 'failed' && item.failure === 'RETRYABLE' && (!entryId || item.entryId === entryId)
                ? { ...item, status: 'queued', failure: null }
                : item,
            ),
          }),
        requeueInFlight: () => set({ items: get().items.map(toQueued) }),
        removeEntry: (entryId) => set({ items: get().items.filter((item) => item.entryId !== entryId) }),
        setPaused: (isPaused) => set({ isPaused }),
        startBulk: (keys) => set({ bulk: { keys: [...keys] }, isPaused: false }),
        // 완료 화면을 닫으면 진행 범위만 지운다(올린 항목은 남겨 다시 가져올 때 건너뛴다)
        finishBulk: () => set({ bulk: null }),
        reset: () => set(EMPTY),
      }),
      {
        name: UPLOAD_QUEUE_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: ({ items, isPaused, bulk }): PersistedQueue => ({ items, isPaused, bulk }),
        merge: (persisted, current) => ({ ...current, ...restore(persisted) }),
        onRehydrateStorage: () => () => {
          store.setState({ hasHydrated: true })
        },
      },
    ),
  )
  return store
}

export type UploadQueueStore = ReturnType<typeof createUploadQueueStore>

// 앱 전역 업로드 대기열 — 루트 레이아웃의 useUploadRunner 가 실행하고, 로그아웃하면 비운다
export const uploadQueue = createUploadQueueStore()
