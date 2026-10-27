import type { CreatePhotoUploadRequest, CreatePhotoUploadResponse, MeResponse, Photo, UploadTarget } from '@you-in-heart/shared'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { AppState } from 'react-native'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { ApiError, type ApiErrorKind } from '@/shared/api/api-error'
import { DIARY_QUERY_KEY, ME_QUERY_KEY, PHOTOS_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { type ResolvedAsset, resolveAsset } from '../util-pick-assets/pick-assets'
import { completePhoto, createPhotoUpload, putFileToTarget, renewPhotoUpload } from './media-api'
import { discardFile, prepareDisplayImage } from './prepare-display-image'
import {
  type UploadFailure,
  type UploadItem,
  type UploadQueueStore,
  uploadQueue,
} from './upload-queue-store'

export const UPLOAD_CONCURRENCY = 3

// 서명 URL 은 300초. 끝나기 직전 URL 로 큰 원본을 보내지 않도록 30초 여유를 둔다
const TARGET_SAFETY_MS = 30_000
const BUSY_RETRIES = 3
const BUSY_BASE_DELAY_MS = 1000
const READY_REFRESH_DELAY_MS = 1500

export type UploadDeps = {
  resolveAsset: (assetId: string) => Promise<ResolvedAsset | null>
  createUpload: (body: CreatePhotoUploadRequest) => Promise<CreatePhotoUploadResponse>
  // 이미 발급된(PENDING) 사진의 서명 URL 만 새로 받는다 — 새 사진을 만들지 않아 20장 제한을 먹지 않는다
  renewUpload: (photoId: string) => Promise<CreatePhotoUploadResponse>
  prepareDisplay: (uri: string) => Promise<{ uri: string }>
  putFile: (fileUri: string, target: UploadTarget) => Promise<void>
  complete: (photoId: string) => Promise<Photo>
  discardFile: (uri: string) => void
  hasLocationConsent: () => boolean
  // complete 성공 → 앨범·타임라인에 보이도록 캐시를 새로 받는다
  onPhotoReady: (photo: Photo) => void
  sleep: (ms: number) => Promise<void>
  now: () => number
}

type IssuedTargets = { original: UploadTarget; display: UploadTarget; expiresAtMs: number }

// 다시 해도 같은 결과인 실패는 재시도 목록에 넣지 않는다
const FAILURE_BY_KIND: Partial<Record<ApiErrorKind, UploadFailure>> = {
  PHOTO_LIMIT: 'PHOTO_LIMIT',
  NOT_AUTHOR: 'GONE',
  NOT_FOUND: 'GONE',
  INVALID_UPLOAD: 'INVALID',
  ORIGINAL_TOO_LARGE: 'INVALID',
}

const toFailure = (error: unknown): UploadFailure =>
  (error instanceof ApiError ? FAILURE_BY_KIND[error.kind] : undefined) ?? 'RETRYABLE'

const isKind = (error: unknown, kind: ApiErrorKind): boolean => error instanceof ApiError && error.kind === kind

const withoutLocation = ({ lat: _lat, lng: _lng, ...rest }: CreatePhotoUploadRequest): CreatePhotoUploadRequest => rest

type CreateRunnerOptions = { store: UploadQueueStore; deps: UploadDeps; concurrency?: number }

// 대기열 실행기: 동시 concurrency 장. 포그라운드·로그인·일시정지 아님·복원 완료일 때만 새 항목을 시작한다.
// 한 장: 업로드 발급 → 표시용 후보 PUT → 원본 PUT → complete. 끝난 단계는 저장소에 남아 다시 하지 않는다
export const createUploadRunner = ({ store, deps, concurrency = UPLOAD_CONCURRENCY }: CreateRunnerOptions) => {
  let inFlight: ReadonlySet<string> = new Set()
  // 서명 URL 은 메모리에만 (photoId → 발급 결과)
  let issued: Readonly<Record<string, IssuedTargets>> = {}
  let isForeground = true
  let isEnabled = true

  const current = (key: string): UploadItem | undefined => store.getState().items.find((item) => item.key === key)
  const update = store.getState().update

  const buildRequest = (item: UploadItem, asset: ResolvedAsset & { mime: NonNullable<ResolvedAsset['mime']> }) => {
    const base: CreatePhotoUploadRequest = {
      entryId: item.entryId,
      originalMime: asset.mime,
      originalBytes: asset.bytes,
      ...(asset.takenAt ? { takenAt: asset.takenAt } : {}),
    }
    return asset.location && deps.hasLocationConsent() ? { ...base, ...asset.location } : base
  }

  // 위치 동의가 방금 꺼졌으면(403 LOCATION_CONSENT_REQUIRED) 좌표 없이 한 번 더
  const requestUpload = async (body: CreatePhotoUploadRequest): Promise<CreatePhotoUploadResponse> => {
    try {
      return await deps.createUpload(body)
    } catch (error) {
      if (body.lat !== undefined && isKind(error, 'LOCATION_CONSENT_REQUIRED')) {
        return deps.createUpload(withoutLocation(body))
      }
      throw error
    }
  }

  const remember = (response: CreatePhotoUploadResponse): IssuedTargets => {
    const targets = {
      original: response.original,
      display: response.display,
      expiresAtMs: deps.now() + response.expiresIn * 1000,
    }
    issued = { ...issued, [response.photoId]: targets }
    return targets
  }

  // 만료(앱 재시작 포함)된 기존 사진: 같은 사진의 URL 을 갱신한다. 이미 올린 단계는 서버에 남아 있어 다시 하지 않는다
  // (빠진 객체가 있으면 complete 가 409 UPLOAD_INCOMPLETE → 다음 시도에서 다시 올린다)
  // 409 ALREADY_COMPLETE = 이미 끝남 → null(올릴 것 없이 complete). 404 = 사진이 사라짐 → 새로 발급
  const renewTargets = async (key: string, photoId: string): Promise<IssuedTargets | null | undefined> => {
    try {
      return remember(await deps.renewUpload(photoId))
    } catch (error) {
      if (isKind(error, 'ALREADY_COMPLETE')) {
        update(key, { isDisplayUploaded: true, isOriginalUploaded: true })
        return null
      }
      if (isKind(error, 'NOT_FOUND')) return undefined
      throw error
    }
  }

  // 발급받은 URL 이 아직 유효하면 이어서 쓰고, 아니면 갱신(기존 사진) 또는 새로 받아 처음부터 올린다
  const ensureTargets = async (key: string, body: CreatePhotoUploadRequest): Promise<IssuedTargets | null> => {
    const item = current(key)
    const known = item?.photoId ? issued[item.photoId] : undefined
    if (known && known.expiresAtMs - TARGET_SAFETY_MS > deps.now()) return known
    if (item?.photoId) {
      const renewed = await renewTargets(key, item.photoId)
      if (renewed !== undefined) return renewed
    }
    const response = await requestUpload(body)
    update(key, { photoId: response.photoId, isDisplayUploaded: false, isOriginalUploaded: false })
    return remember(response)
  }

  // 503 BUSY(서버 이미지 처리 밀림)는 1·2·4초 기다렸다가 다시
  const completeWithBackoff = async (photoId: string, attempt = 0): Promise<Photo> => {
    try {
      return await deps.complete(photoId)
    } catch (error) {
      if (!isKind(error, 'BUSY') || attempt >= BUSY_RETRIES - 1) throw error
      await deps.sleep(BUSY_BASE_DELAY_MS * 2 ** attempt)
      return completeWithBackoff(photoId, attempt + 1)
    }
  }

  const uploadDisplay = async (key: string, localUri: string, target: UploadTarget) => {
    const display = await deps.prepareDisplay(localUri)
    try {
      await deps.putFile(display.uri, target)
    } finally {
      deps.discardFile(display.uri)
    }
    update(key, { isDisplayUploaded: true })
  }

  const isComplete = (item: UploadItem | undefined): boolean =>
    Boolean(item?.photoId && item.isDisplayUploaded && item.isOriginalUploaded)

  const processItem = async (key: string): Promise<void> => {
    const asset = await deps.resolveAsset(current(key)?.assetId ?? '')
    if (!asset) return update(key, { status: 'failed', failure: 'GONE' })
    const { mime } = asset
    if (!mime) return update(key, { status: 'failed', failure: 'UNSUPPORTED' })
    const item = current(key)
    if (!item) return
    if (!isComplete(item)) {
      const targets = await ensureTargets(key, buildRequest(item, { ...asset, mime }))
      if (targets && !current(key)?.isDisplayUploaded) await uploadDisplay(key, asset.localUri, targets.display)
      if (targets && !current(key)?.isOriginalUploaded) {
        await deps.putFile(asset.localUri, targets.original)
        update(key, { isOriginalUploaded: true })
      }
    }
    const photoId = current(key)?.photoId
    if (!photoId) return
    const photo = await completeWithBackoff(photoId)
    update(key, { status: 'done', failure: null })
    deps.onPhotoReady(photo)
  }

  // 409 UPLOAD_INCOMPLETE: 서버에 객체가 없다 → 다음 시도에서 새로 받아 처음부터
  const handleError = (key: string, error: unknown) => {
    if (!current(key)) return
    if (isKind(error, 'UPLOAD_INCOMPLETE')) update(key, { isDisplayUploaded: false, isOriginalUploaded: false })
    // 백그라운드에서 끊긴 것은 실패가 아니다 — 대기로 두고 포그라운드에서 이어 간다
    if (!isForeground) return update(key, { status: 'queued' })
    update(key, { status: 'failed', failure: toFailure(error) })
  }

  const canStart = (): boolean => {
    const state = store.getState()
    return isForeground && isEnabled && state.hasHydrated && !state.isPaused
  }

  const start = (key: string) => {
    inFlight = new Set([...inFlight, key])
    update(key, { status: 'uploading' })
    processItem(key)
      .catch((error: unknown) => handleError(key, error))
      .finally(() => {
        inFlight = new Set([...inFlight].filter((item) => item !== key))
        pump()
      })
  }

  const pump = (): void => {
    if (!canStart()) return
    const slots = concurrency - inFlight.size
    if (slots <= 0) return
    store
      .getState()
      .items.filter((item) => item.status === 'queued' && !inFlight.has(item.key))
      .slice(0, slots)
      .forEach((item) => start(item.key))
  }

  return {
    pump,
    setForeground: (next: boolean) => {
      isForeground = next
      pump()
    },
    setEnabled: (next: boolean) => {
      isEnabled = next
      pump()
    },
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// 일괄 등록은 수백 장이 연달아 끝난다 → 목록 새로고침을 1.5초에 한 번으로 묶는다
const createReadyRefresher = (queryClient: QueryClient) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      queryClient.invalidateQueries({ queryKey: PHOTOS_QUERY_KEY }).catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEY }).catch(() => undefined)
    }, READY_REFRESH_DELAY_MS)
  }
}

const createAppDeps = (queryClient: QueryClient): UploadDeps => {
  const refresh = createReadyRefresher(queryClient)
  return {
    resolveAsset,
    createUpload: createPhotoUpload,
    renewUpload: renewPhotoUpload,
    prepareDisplay: prepareDisplayImage,
    putFile: putFileToTarget,
    complete: completePhoto,
    discardFile,
    // 동의 상태를 모르면(아직 /me 전) 보내지 않는다
    hasLocationConsent: () => queryClient.getQueryData<MeResponse>(ME_QUERY_KEY)?.consents.location === true,
    onPhotoReady: () => refresh(),
    sleep,
    now: () => Date.now(),
  }
}

// 루트 레이아웃에서 한 번: 로그인 중 포그라운드에서만 올린다. 백그라운드로 가면 새로 시작하지 않고 목록은 유지,
// 돌아오면 이어서. 로그아웃(세션 종료)하면 다른 계정이 이어받지 않도록 대기열을 비운다
export const useUploadRunner = (): void => {
  const queryClient = useQueryClient()
  const sessionStatus = useSessionStatus()
  const hasHydrated = useStore(uploadQueue, (state) => state.hasHydrated)
  const runner = useMemo(() => createUploadRunner({ store: uploadQueue, deps: createAppDeps(queryClient) }), [queryClient])

  useEffect(() => {
    if (sessionStatus === 'signedOut' && hasHydrated) uploadQueue.getState().reset()
    runner.setEnabled(sessionStatus === 'signedIn')
  }, [runner, sessionStatus, hasHydrated])

  useEffect(() => uploadQueue.subscribe(() => runner.pump()), [runner])

  useEffect(() => {
    runner.setForeground(AppState.currentState === 'active')
    const subscription = AppState.addEventListener('change', (next) => runner.setForeground(next === 'active'))
    return () => subscription.remove()
  }, [runner])
}

// 화면용: 한 기록의 업로드 항목들(작성 화면 진행률·다시 올리기)
export const useEntryUploads = (entryId: string | null): UploadItem[] =>
  useStore(
    uploadQueue,
    useShallow((state) => (entryId ? state.items.filter((item) => item.entryId === entryId) : [])),
  )

export const enqueuePhotos = (entryId: string, assetIds: readonly string[]): string[] =>
  uploadQueue.getState().enqueue(entryId, assetIds)

export const retryEntryUploads = (entryId: string): void => uploadQueue.getState().retryFailed(entryId)
