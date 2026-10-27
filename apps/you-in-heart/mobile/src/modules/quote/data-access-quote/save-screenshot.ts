import { MAX_SCREENSHOT_BYTES, type Quote } from '@you-in-heart/shared'
import { putFileToTarget } from '@/modules/media/data-access-media/media-api'
import { discardFile, prepareDisplayImage } from '@/modules/media/data-access-media/prepare-display-image'
import { ApiError, type ApiErrorKind } from '@/shared/api/api-error'
import { readFileSize } from './file-info'
import { completeScreenshot, createScreenshotUpload } from './quote-api'

const COMPLETE_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000
// 서버 처리 밀림(503 BUSY)·막 올린 객체가 아직 안 보임(409 UPLOAD_INCOMPLETE)은 잠시 뒤 다시
const RETRYABLE_KINDS: readonly ApiErrorKind[] = ['BUSY', 'UPLOAD_INCOMPLETE']
const INVALID_KINDS: readonly ApiErrorKind[] = ['INVALID_UPLOAD', 'SCREENSHOT_TOO_LARGE']

// 다시 해도 안 되는 이미지(형식·크기) → 다른 사진을 고르게 한다
export class ScreenshotInvalidError extends Error {
  constructor() {
    super('저장할 수 없는 이미지예요')
    this.name = 'ScreenshotInvalidError'
  }
}

const kindOf = (error: unknown): ApiErrorKind | null => (error instanceof ApiError ? error.kind : null)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const completeWithRetry = async (quoteId: string, attempt = 0): Promise<Quote> => {
  try {
    return await completeScreenshot(quoteId)
  } catch (error) {
    const kind = kindOf(error)
    if (kind && INVALID_KINDS.includes(kind)) throw new ScreenshotInvalidError()
    if (!kind || !RETRYABLE_KINDS.includes(kind) || attempt >= COMPLETE_RETRIES - 1) throw error
    await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
    return completeWithRetry(quoteId, attempt + 1)
  }
}

const requestUpload = async (bytes: number, memo: string | undefined) => {
  try {
    return await createScreenshotUpload({ mime: 'image/jpeg', bytes, ...(memo ? { memo } : {}) })
  } catch (error) {
    const kind = kindOf(error)
    if (kind && INVALID_KINDS.includes(kind)) throw new ScreenshotInvalidError()
    throw error
  }
}

// SCR-13 스크린샷 저장: 표시용 JPEG 로 줄여(EXIF 는 서버가 다시 인코딩하며 지운다) 발급 → PUT → complete.
// 원본 경로·URL 은 로그에 남기지 않고, 줄인 파일은 끝나면 지운다
export const saveScreenshot = async ({ sourceUri, memo }: { sourceUri: string; memo?: string }): Promise<Quote> => {
  const display = await prepareDisplayImage(sourceUri)
  try {
    const bytes = readFileSize(display.uri)
    if (bytes <= 0 || bytes > MAX_SCREENSHOT_BYTES) throw new ScreenshotInvalidError()
    const { quoteId, upload } = await requestUpload(bytes, memo)
    await putFileToTarget(display.uri, upload)
    return await completeWithRetry(quoteId)
  } finally {
    discardFile(display.uri)
  }
}
