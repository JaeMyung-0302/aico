import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createUploadQueueStore,
  UPLOAD_QUEUE_STORAGE_KEY,
  uploadKey,
  uploadProgress,
} from '../data-access-media/upload-queue-store'

const ENTRY = '01890a5d-ac96-774b-bcce-b302099a8201'
const OTHER_ENTRY = '01890a5d-ac96-774b-bcce-b302099a8202'

const createHydratedStore = async () => {
  const store = createUploadQueueStore()
  await store.persist.rehydrate()
  return store
}

beforeEach(async () => {
  await AsyncStorage.clear()
})

describe('upload-queue-store', () => {
  it('엔트리·자산 쌍으로 대기열에 넣고, 이미 있는 쌍은 다시 넣지 않는다', async () => {
    const store = await createHydratedStore()
    const keys = store.getState().enqueue(ENTRY, ['a1', 'a2'])
    expect(keys).toEqual([uploadKey(ENTRY, 'a1'), uploadKey(ENTRY, 'a2')])

    store.getState().update(uploadKey(ENTRY, 'a1'), { status: 'done', photoId: 'p1' })
    store.getState().enqueue(ENTRY, ['a1', 'a3'])

    const items = store.getState().items
    expect(items.map((item) => [item.assetId, item.status])).toEqual([
      ['a1', 'done'],
      ['a2', 'queued'],
      ['a3', 'queued'],
    ])
  })

  it('다시 올리기는 재시도 가능한 실패만 대기열로 돌린다 (20장 초과 같은 실패는 그대로)', async () => {
    const store = await createHydratedStore()
    store.getState().enqueue(ENTRY, ['a1', 'a2'])
    store.getState().enqueue(OTHER_ENTRY, ['b1'])
    store.getState().update(uploadKey(ENTRY, 'a1'), { status: 'failed', failure: 'RETRYABLE' })
    store.getState().update(uploadKey(ENTRY, 'a2'), { status: 'failed', failure: 'PHOTO_LIMIT' })
    store.getState().update(uploadKey(OTHER_ENTRY, 'b1'), { status: 'failed', failure: 'RETRYABLE' })

    store.getState().retryFailed(ENTRY)

    const statusOf = (key: string) => store.getState().items.find((item) => item.key === key)?.status
    expect(statusOf(uploadKey(ENTRY, 'a1'))).toBe('queued')
    expect(statusOf(uploadKey(ENTRY, 'a2'))).toBe('failed')
    expect(statusOf(uploadKey(OTHER_ENTRY, 'b1'))).toBe('failed')
  })

  it('앱이 멈추면(백그라운드·종료) 올리던 항목을 대기로 되돌려 목록을 유지한다', async () => {
    const store = await createHydratedStore()
    store.getState().enqueue(ENTRY, ['a1', 'a2'])
    store.getState().update(uploadKey(ENTRY, 'a1'), { status: 'uploading', isDisplayUploaded: true })

    store.getState().requeueInFlight()

    expect(store.getState().items.map((item) => item.status)).toEqual(['queued', 'queued'])
    expect(store.getState().items[0]?.isDisplayUploaded).toBe(true)
  })

  it('기기 저장소에서 목록을 복원하고, 올리던 중 종료된 항목은 대기로 바꾼다', async () => {
    const first = await createHydratedStore()
    first.getState().enqueue(ENTRY, ['a1', 'a2'])
    first.getState().update(uploadKey(ENTRY, 'a1'), { status: 'uploading', photoId: 'p1' })
    first.getState().update(uploadKey(ENTRY, 'a2'), { status: 'done', photoId: 'p2' })

    const restored = await createHydratedStore()

    expect(restored.getState().hasHydrated).toBe(true)
    expect(restored.getState().items.map((item) => [item.assetId, item.status, item.photoId])).toEqual([
      ['a1', 'queued', 'p1'],
      ['a2', 'done', 'p2'],
    ])
  })

  it('기기 저장소에는 사진 경로·위치·서명 URL 을 남기지 않는다 (자산 id 와 단계만)', async () => {
    const store = await createHydratedStore()
    store.getState().enqueue(ENTRY, ['a1'])
    const raw = await AsyncStorage.getItem(UPLOAD_QUEUE_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(raw).not.toMatch(/uri|lat|lng|location|url/i)
  })

  it('저장소 값이 깨져 있으면 빈 목록으로 시작한다', async () => {
    await AsyncStorage.setItem(UPLOAD_QUEUE_STORAGE_KEY, JSON.stringify({ state: { items: [{ key: 1 }] }, version: 1 }))
    const store = await createHydratedStore()
    expect(store.getState().items).toEqual([])
    expect(store.getState().hasHydrated).toBe(true)
  })

  it('엔트리 삭제·로그아웃 정리', async () => {
    const store = await createHydratedStore()
    store.getState().enqueue(ENTRY, ['a1'])
    store.getState().enqueue(OTHER_ENTRY, ['b1'])
    store.getState().removeEntry(ENTRY)
    expect(store.getState().items.map((item) => item.entryId)).toEqual([OTHER_ENTRY])

    store.getState().setPaused(true)
    store.getState().reset()
    expect(store.getState()).toMatchObject({ items: [], isPaused: false, bulk: null })
  })

  it('일괄 등록 범위: 시작하면 일시정지를 풀고, 끝내면 범위만 지운다(올린 항목은 남긴다)', async () => {
    const store = await createHydratedStore()
    const keys = store.getState().enqueue(ENTRY, ['a1'])
    store.getState().setPaused(true)
    store.getState().startBulk(keys)
    expect(store.getState()).toMatchObject({ bulk: { keys }, isPaused: false })
    store.getState().finishBulk()
    expect(store.getState().bulk).toBeNull()
    expect(store.getState().items).toHaveLength(1)
  })

  it('진행률은 단계로 계산한다 (완료 1)', async () => {
    const store = await createHydratedStore()
    store.getState().enqueue(ENTRY, ['a1'])
    const [item] = store.getState().items
    if (!item) throw new Error('item missing')
    expect(uploadProgress(item)).toBe(0)
    expect(uploadProgress({ ...item, photoId: 'p', isDisplayUploaded: true })).toBeCloseTo(0.4)
    expect(uploadProgress({ ...item, status: 'done' })).toBe(1)
  })
})
