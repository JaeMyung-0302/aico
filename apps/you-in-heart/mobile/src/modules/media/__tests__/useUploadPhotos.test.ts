import {
  type CreatePhotoUploadRequest,
  type CreatePhotoUploadResponse,
  MAX_DISPLAY_CANDIDATE_BYTES,
  type Photo,
  type RenewPhotoUploadRequest,
} from '@you-in-heart/shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { waitFor } from '@testing-library/react-native'
import { ApiError } from '@/shared/api/api-error'
import { createUploadQueueStore, uploadKey } from '../data-access-media/upload-queue-store'
import { createUploadRunner, UPLOAD_CONCURRENCY, type UploadDeps } from '../data-access-media/useUploadPhotos'
import type { ResolvedAsset } from '../util-pick-assets/pick-assets'

const ENTRY = '01890a5d-ac96-774b-bcce-b302099a8201'
const PHOTO_ID = '01890a5d-ac96-774b-bcce-b302099a8301'
const NOW_MS = Date.parse('2026-10-27T03:00:00.000Z')
const DISPLAY_BYTES = 480_000

const ORIGINAL_HEADERS = { 'Content-Type': 'image/heic', 'Content-Length': '1000' }
const UPLOAD: CreatePhotoUploadResponse = {
  photoId: PHOTO_ID,
  original: { url: 'https://r2.test/o?sig=1', headers: ORIGINAL_HEADERS },
  display: { url: 'https://r2.test/incoming?sig=2', headers: { 'Content-Type': 'image/jpeg' } },
  expiresIn: 300,
}

// POST /photos/:id/uploads/renew — 같은 사진(PENDING)에 새 서명 URL
const RENEWED: CreatePhotoUploadResponse = {
  ...UPLOAD,
  original: { url: 'https://r2.test/o?sig=renewed', headers: ORIGINAL_HEADERS },
  display: { url: 'https://r2.test/incoming?sig=renewed', headers: { 'Content-Type': 'image/jpeg' } },
}

const READY: Photo = {
  id: PHOTO_ID,
  entryId: ENTRY,
  uploaderId: '01890a5d-ac96-774b-bcce-b302099a8057',
  status: 'READY',
  takenAt: '2026-10-25T03:00:00.000Z',
  width: 2048,
  height: 1536,
  thumbUrl: 'https://r2.test/t.jpg',
  displayUrl: 'https://r2.test/d.jpg',
}

const ASSET: ResolvedAsset = {
  localUri: 'file:///DCIM/IMG_0001.HEIC',
  mime: 'image/heic',
  bytes: 1000,
  takenAt: '2026-10-25T03:00:00.000Z',
  location: { lat: 37.5446, lng: 127.0374 },
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }
const defer = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const httpError = (status: number, serverCode?: string) =>
  new ApiError({ code: 'HTTP', status, message: 'x', serverCode })

let nowMs = NOW_MS

const defaultDeps = () => ({
    resolveAsset: jest.fn<Promise<ResolvedAsset | null>, [string]>(async () => ASSET),
    createUpload: jest.fn<Promise<CreatePhotoUploadResponse>, [CreatePhotoUploadRequest]>(async () => UPLOAD),
    renewUpload: jest.fn<Promise<CreatePhotoUploadResponse>, [string, RenewPhotoUploadRequest]>(async () => RENEWED),
    prepareDisplay: jest.fn<Promise<{ uri: string; bytes: number }>, [string]>(async () => ({
      uri: 'file:///cache/display.jpg',
      bytes: DISPLAY_BYTES,
    })),
    putFile: jest.fn<Promise<void>, [string, { url: string; headers: Record<string, string> }]>(async () => undefined),
    complete: jest.fn<Promise<Photo>, [string]>(async () => READY),
    discardFile: jest.fn<void, [string]>(),
    hasLocationConsent: jest.fn(() => false),
    onPhotoReady: jest.fn<void, [Photo]>(),
    sleep: jest.fn<Promise<void>, [number]>(async () => undefined),
    now: () => nowMs,
})
type FakeDeps = ReturnType<typeof defaultDeps>

const makeDeps = (overrides: Partial<FakeDeps>): FakeDeps & UploadDeps => ({ ...defaultDeps(), ...overrides })

const setup = async (overrides: Partial<FakeDeps> = {}) => {
  const store = createUploadQueueStore()
  await store.persist.rehydrate()
  const deps = makeDeps(overrides)
  const runner = createUploadRunner({ store, deps })
  return { store, deps, runner }
}

const statuses = (store: ReturnType<typeof createUploadQueueStore>) =>
  store.getState().items.map((item) => item.status)

beforeEach(async () => {
  jest.clearAllMocks()
  nowMs = NOW_MS
  await AsyncStorage.clear()
})

describe('createUploadRunner (업로드 큐 실행)', () => {
  it('동시에 3장까지만 올리고, 하나가 끝나면 다음을 시작한다', async () => {
    const gates = Array.from({ length: 5 }, () => defer<ResolvedAsset | null>())
    let calls = 0
    const { store, deps, runner } = await setup({
      resolveAsset: jest.fn(async (_assetId: string) => {
        const gate = gates[calls]
        calls += 1
        return gate ? gate.promise : null
      }),
    })

    store.getState().enqueue(ENTRY, ['a1', 'a2', 'a3', 'a4', 'a5'])
    runner.pump()

    expect(UPLOAD_CONCURRENCY).toBe(3)
    await waitFor(() => expect(deps.resolveAsset).toHaveBeenCalledTimes(3))
    expect(statuses(store)).toEqual(['uploading', 'uploading', 'uploading', 'queued', 'queued'])

    gates[0]?.resolve(ASSET)
    await waitFor(() => expect(deps.resolveAsset).toHaveBeenCalledTimes(4))
    expect(statuses(store).filter((status) => status === 'uploading')).toHaveLength(3)
  })

  it('표시용 → 원본(서명된 헤더 그대로) → complete 순서로 올리고, 끝나면 앨범에 보이도록 알린다', async () => {
    const { store, deps, runner } = await setup()
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(deps.createUpload).toHaveBeenCalledWith({
      entryId: ENTRY,
      originalMime: 'image/heic',
      originalBytes: 1000,
      displayBytes: DISPLAY_BYTES,
      takenAt: '2026-10-25T03:00:00.000Z',
    })
    expect(deps.prepareDisplay).toHaveBeenCalledWith(ASSET.localUri)
    expect(deps.putFile.mock.calls).toEqual([
      ['file:///cache/display.jpg', UPLOAD.display],
      [ASSET.localUri, { url: UPLOAD.original.url, headers: ORIGINAL_HEADERS }],
    ])
    expect(deps.discardFile).toHaveBeenCalledWith('file:///cache/display.jpg')
    expect(deps.complete).toHaveBeenCalledWith(PHOTO_ID)
    expect(deps.onPhotoReady).toHaveBeenCalledWith(READY)
    expect(store.getState().items[0]?.photoId).toBe(PHOTO_ID)
  })

  it('위치 동의가 꺼져 있으면 lat·lng 를 보내지 않고, 켜져 있으면 보낸다', async () => {
    const off = await setup()
    off.store.getState().enqueue(ENTRY, ['a1'])
    off.runner.pump()
    await waitFor(() => expect(off.deps.complete).toHaveBeenCalled())
    expect(off.deps.createUpload.mock.calls[0]?.[0]).not.toHaveProperty('lat')
    expect(off.deps.createUpload.mock.calls[0]?.[0]).not.toHaveProperty('lng')

    const on = await setup({ hasLocationConsent: jest.fn(() => true) })
    on.store.getState().enqueue(ENTRY, ['a2'])
    on.runner.pump()
    await waitFor(() => expect(on.deps.complete).toHaveBeenCalled())
    expect(on.deps.createUpload.mock.calls[0]?.[0]).toMatchObject({ lat: 37.5446, lng: 127.0374 })
  })

  it('원본 PUT 이 실패하면 재시도 목록에 남고(complete 없음), 다시 올리면 원본만 올린 뒤 앨범에 보인다', async () => {
    const putFile = jest
      .fn<Promise<void>, [string, { url: string; headers: Record<string, string> }]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined)
    const { store, deps, runner } = await setup({ putFile })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['failed']))
    expect(store.getState().items[0]).toMatchObject({ failure: 'RETRYABLE', isDisplayUploaded: true })
    expect(deps.complete).not.toHaveBeenCalled()
    expect(deps.onPhotoReady).not.toHaveBeenCalled()

    store.getState().retryFailed(ENTRY)
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(deps.createUpload).toHaveBeenCalledTimes(1)
    expect(putFile).toHaveBeenCalledTimes(3)
    expect(putFile.mock.calls[2]?.[0]).toBe(ASSET.localUri)
    expect(deps.onPhotoReady).toHaveBeenCalledWith(READY)
  })

  const failOriginalOnce = () =>
    jest
      .fn<Promise<void>, [string, { url: string; headers: Record<string, string> }]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined)

  it('서명 URL(300초)이 지난 뒤 다시 올리면 새 사진을 만들지 않고 같은 사진의 URL 을 갱신해 남은 원본만 올린다', async () => {
    const putFile = failOriginalOnce()
    const { store, deps, runner } = await setup({ putFile })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['failed']))

    nowMs += 301_000
    store.getState().retryFailed(ENTRY)
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    // 고아 PENDING 행이 20장 제한을 먹지 않도록 createUpload 는 처음 한 번뿐
    expect(deps.createUpload).toHaveBeenCalledTimes(1)
    expect(deps.renewUpload).toHaveBeenCalledWith(PHOTO_ID, { displayBytes: DISPLAY_BYTES })
    // 갱신 요청에 표시용 크기가 필요해 후보를 다시 만들지만, 이미 올린 표시용은 다시 PUT 하지 않는다
    expect(deps.prepareDisplay).toHaveBeenCalledTimes(2)
    expect(putFile).toHaveBeenCalledTimes(3)
    expect(putFile.mock.calls[2]).toEqual([ASSET.localUri, RENEWED.original])
    expect(deps.complete).toHaveBeenCalledWith(PHOTO_ID)
  })

  it('앱을 다시 켜서(서명 URL 이 메모리에 없음) 이어 올릴 때도 같은 사진을 갱신한다', async () => {
    const putFile = failOriginalOnce()
    const first = await setup({ putFile })
    first.store.getState().enqueue(ENTRY, ['a1'])
    first.runner.pump()
    await waitFor(() => expect(statuses(first.store)).toEqual(['failed']))

    const deps = makeDeps({})
    const restarted = createUploadRunner({ store: first.store, deps })
    first.store.getState().retryFailed(ENTRY)
    restarted.pump()

    await waitFor(() => expect(statuses(first.store)).toEqual(['done']))
    expect(deps.createUpload).not.toHaveBeenCalled()
    expect(deps.renewUpload).toHaveBeenCalledWith(PHOTO_ID, { displayBytes: DISPLAY_BYTES })
  })

  it('갱신이 409 ALREADY_COMPLETE 면 다시 올리지 않고 complete 로 마무리한다', async () => {
    const putFile = failOriginalOnce()
    const renewUpload = jest
      .fn<Promise<CreatePhotoUploadResponse>, [string, RenewPhotoUploadRequest]>()
      .mockRejectedValue(httpError(409, 'ALREADY_COMPLETE'))
    const { store, deps, runner } = await setup({ putFile, renewUpload })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['failed']))

    nowMs += 301_000
    store.getState().retryFailed(ENTRY)
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(putFile).toHaveBeenCalledTimes(2)
    expect(deps.createUpload).toHaveBeenCalledTimes(1)
    expect(deps.complete).toHaveBeenCalledWith(PHOTO_ID)
  })

  it('갱신이 404(사진이 사라짐)면 새 업로드를 받아 처음부터 올린다', async () => {
    const putFile = failOriginalOnce()
    const renewUpload = jest
      .fn<Promise<CreatePhotoUploadResponse>, [string, RenewPhotoUploadRequest]>()
      .mockRejectedValue(httpError(404))
    const { store, deps, runner } = await setup({ putFile, renewUpload })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['failed']))

    nowMs += 301_000
    store.getState().retryFailed(ENTRY)
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(deps.createUpload).toHaveBeenCalledTimes(2)
    expect(deps.prepareDisplay).toHaveBeenCalledTimes(2)
  })

  it('앱이 백그라운드로 가면 새로 시작하지 않고, 그때 끊긴 항목은 실패가 아니라 대기로 남는다', async () => {
    const gate = defer<ResolvedAsset | null>()
    const resolveAsset = jest
      .fn<Promise<ResolvedAsset | null>, [string]>()
      .mockReturnValueOnce(gate.promise)
      .mockResolvedValue(ASSET)
    const { store, deps, runner } = await setup({ resolveAsset })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['uploading']))

    runner.setForeground(false)
    store.getState().enqueue(ENTRY, ['a2'])
    gate.reject(new Error('connection lost'))

    await waitFor(() => expect(statuses(store)).toEqual(['queued', 'queued']))
    expect(deps.resolveAsset).toHaveBeenCalledTimes(1)

    runner.setForeground(true)
    await waitFor(() => expect(statuses(store)).toEqual(['done', 'done']))
  })

  it('일시정지 중에는 시작하지 않는다', async () => {
    const { store, deps, runner } = await setup()
    store.getState().setPaused(true)
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await Promise.resolve()
    expect(deps.resolveAsset).not.toHaveBeenCalled()
    expect(statuses(store)).toEqual(['queued'])
  })

  it('complete 가 503 BUSY 면 기다렸다가(지수 백오프) 다시 부른다', async () => {
    const complete = jest
      .fn<Promise<Photo>, [string]>()
      .mockRejectedValueOnce(httpError(503, 'BUSY'))
      .mockRejectedValueOnce(httpError(503, 'BUSY'))
      .mockResolvedValue(READY)
    const { store, deps, runner } = await setup({ complete })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(complete).toHaveBeenCalledTimes(3)
    expect(deps.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000])
  })

  it('20장 초과(PHOTO_LIMIT)는 다시 시도하지 않는 실패로 남긴다', async () => {
    const { store, runner } = await setup({
      createUpload: jest
        .fn<Promise<CreatePhotoUploadResponse>, [CreatePhotoUploadRequest]>()
        .mockRejectedValue(httpError(400, 'PHOTO_LIMIT')),
    })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(store.getState().items[0]).toMatchObject({ status: 'failed', failure: 'PHOTO_LIMIT' }))
  })

  it('서버가 위치 동의를 요구하면(동의가 방금 꺼짐) 좌표 없이 다시 요청한다', async () => {
    const createUpload = jest
      .fn<Promise<CreatePhotoUploadResponse>, [CreatePhotoUploadRequest]>()
      .mockRejectedValueOnce(httpError(403, 'LOCATION_CONSENT_REQUIRED'))
      .mockResolvedValue(UPLOAD)
    const { store, runner } = await setup({ createUpload, hasLocationConsent: jest.fn(() => true) })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(createUpload.mock.calls[0]?.[0]).toHaveProperty('lat')
    expect(createUpload.mock.calls[1]?.[0]).not.toHaveProperty('lat')
  })

  it('사진이 기기에서 사라졌거나 형식을 지원하지 않으면 실패로 표시한다', async () => {
    const { store, runner } = await setup({
      resolveAsset: jest
        .fn<Promise<ResolvedAsset | null>, [string]>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...ASSET, mime: null }),
    })
    store.getState().enqueue(ENTRY, ['gone', 'gif'])
    runner.pump()
    await waitFor(() =>
      expect(store.getState().items.map((item) => item.failure)).toEqual(['GONE', 'UNSUPPORTED']),
    )
  })

  it('완료된 자산은 다시 넣어도 올리지 않는다', async () => {
    const { store, deps, runner } = await setup()
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['done']))

    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await Promise.resolve()
    expect(deps.resolveAsset).toHaveBeenCalledTimes(1)
    expect(store.getState().items.find((item) => item.key === uploadKey(ENTRY, 'a1'))?.status).toBe('done')
  })
  // 서버 흉내: 발급마다 새 사진, 두 객체가 다 올라가야 complete, 21장째부터 PHOTO_LIMIT
  const fakeServer = () => {
    const uploaded = new Set<string>()
    const created: string[] = []
    const createUpload = jest.fn(async (_body: CreatePhotoUploadRequest): Promise<CreatePhotoUploadResponse> => {
      const photoId = `p${created.length}`
      created.push(photoId)
      if (created.length > 20) throw httpError(400, 'PHOTO_LIMIT')
      return { photoId, original: { url: `o:${photoId}`, headers: {} }, display: { url: `d:${photoId}`, headers: {} }, expiresIn: 300 }
    })
    const putFile = jest.fn(async (_uri: string, target: { url: string; headers: Record<string, string> }) => {
      uploaded.add(target.url)
    })
    const complete = jest.fn(async (photoId: string): Promise<Photo> => {
      if (!uploaded.has(`o:${photoId}`) || !uploaded.has(`d:${photoId}`)) throw httpError(409, 'UPLOAD_INCOMPLETE')
      return { ...READY, id: photoId }
    })
    return { createUpload, putFile, complete }
  }

  it('저장소 구독(useUploadRunner 처럼)이 붙어 있어도 같은 항목을 두 번 시작하지 않는다', async () => {
    const gates = Array.from({ length: 5 }, () => defer<ResolvedAsset | null>())
    let calls = 0
    const { store, deps, runner } = await setup({
      resolveAsset: jest.fn(async (_assetId: string) => {
        const gate = gates[calls]
        calls += 1
        return gate ? gate.promise : null
      }),
    })
    store.subscribe(() => runner.pump())

    store.getState().enqueue(ENTRY, ['a1', 'a2', 'a3', 'a4', 'a5'])
    await waitFor(() => expect(statuses(store)).toEqual(['uploading', 'uploading', 'uploading', 'queued', 'queued']))
    expect(deps.resolveAsset).toHaveBeenCalledTimes(3)
    expect(new Set(deps.resolveAsset.mock.calls.map(([assetId]) => assetId))).toEqual(new Set(['a1', 'a2', 'a3']))
  })

  it('구독이 붙은 채 20장을 넣으면 정확히 20번만 발급받고 모두 끝난다(PHOTO_LIMIT 없음)', async () => {
    const server = fakeServer()
    const { store, deps, runner } = await setup(server)
    store.subscribe(() => runner.pump())

    store.getState().enqueue(
      ENTRY,
      Array.from({ length: 20 }, (_, index) => `a${index}`),
    )

    await waitFor(() => expect(statuses(store).every((status) => status === 'done')).toBe(true))
    expect(server.createUpload).toHaveBeenCalledTimes(20)
    expect(deps.resolveAsset).toHaveBeenCalledTimes(20)
    expect(store.getState().items.map((item) => item.failure)).not.toContain('PHOTO_LIMIT')
  })

  it('표시용 후보가 15MB 를 넘으면 발급받지 않고 기기에서 실패로 끝낸다', async () => {
    const { store, deps, runner } = await setup({
      prepareDisplay: jest.fn(async (_uri: string) => ({ uri: 'file:///cache/display.jpg', bytes: MAX_DISPLAY_CANDIDATE_BYTES + 1 })),
    })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()

    await waitFor(() => expect(store.getState().items[0]).toMatchObject({ status: 'failed', failure: 'INVALID' }))
    expect(deps.createUpload).not.toHaveBeenCalled()
    expect(deps.putFile).not.toHaveBeenCalled()
    expect(deps.discardFile).toHaveBeenCalledWith('file:///cache/display.jpg')
  })

  it('표시용을 아직 못 올렸으면 남은 URL 이 있어도 지금 만든 크기로 다시 발급받는다(서명된 Content-Length)', async () => {
    const putFile = jest
      .fn<Promise<void>, [string, { url: string; headers: Record<string, string> }]>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined)
    const { store, deps, runner } = await setup({ putFile })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['failed']))

    store.getState().retryFailed(ENTRY)
    runner.pump()

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(deps.createUpload).toHaveBeenCalledTimes(1)
    expect(deps.renewUpload).toHaveBeenCalledWith(PHOTO_ID, { displayBytes: DISPLAY_BYTES })
    expect(putFile.mock.calls[1]).toEqual(['file:///cache/display.jpg', RENEWED.display])
  })

  it('지난 시도의 사진이 서버에서 사라졌으면(complete 404) 실패 대신 새로 발급받아 처음부터 올린다', async () => {
    const putFile = failOriginalOnce()
    const complete = jest.fn<Promise<Photo>, [string]>().mockRejectedValueOnce(httpError(404)).mockResolvedValue(READY)
    const first = await setup({ putFile })
    first.store.getState().enqueue(ENTRY, ['a1'])
    first.runner.pump()
    await waitFor(() => expect(statuses(first.store)).toEqual(['failed']))
    first.store.getState().update(uploadKey(ENTRY, 'a1'), { isOriginalUploaded: true })

    // 앱을 다시 켠 뒤(발급 기록 없음) 이어 올린다
    const deps = makeDeps({ complete })
    const restarted = createUploadRunner({ store: first.store, deps })
    first.store.getState().retryFailed(ENTRY)
    restarted.pump()

    await waitFor(() => expect(statuses(first.store)).toEqual(['done']))
    expect(complete).toHaveBeenCalledTimes(2)
    expect(deps.createUpload).toHaveBeenCalledTimes(1)
    expect(deps.putFile).toHaveBeenCalledTimes(2)
  })

  it('방금 발급받은 사진의 complete 가 404 면 GONE 으로 끝낸다(무한 재발급 없음)', async () => {
    const { store, deps, runner } = await setup({
      complete: jest.fn<Promise<Photo>, [string]>().mockRejectedValue(httpError(404)),
    })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()

    await waitFor(() => expect(store.getState().items[0]).toMatchObject({ status: 'failed', failure: 'GONE' }))
    expect(deps.createUpload).toHaveBeenCalledTimes(1)
  })

  it('백그라운드에서 끊긴 연결 오류가 포그라운드로 돌아온 뒤 도착해도 실패가 아니라 대기로 둔다', async () => {
    const gate = defer<ResolvedAsset | null>()
    const resolveAsset = jest
      .fn<Promise<ResolvedAsset | null>, [string]>()
      .mockReturnValueOnce(gate.promise)
      .mockResolvedValue(ASSET)
    const { store, deps, runner } = await setup({ resolveAsset })
    store.getState().enqueue(ENTRY, ['a1'])
    runner.pump()
    await waitFor(() => expect(statuses(store)).toEqual(['uploading']))

    runner.setForeground(false)
    runner.setForeground(true)
    gate.reject(new ApiError({ code: 'NETWORK', message: 'x' }))

    await waitFor(() => expect(statuses(store)).toEqual(['done']))
    expect(deps.resolveAsset).toHaveBeenCalledTimes(2)
  })
})
