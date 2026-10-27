import { Injectable } from '@nestjs/common'
import { DISPLAY_LONG_EDGE, THUMB_LONG_EDGE } from '@you-in-heart/shared'
import sharp from 'sharp'

// MiriPet src/media/image-sanitizer.ts 복제. 512MB 컨테이너 메모리 상한(1D.6):
// libvips 스레드 1개 + 작업 캐시 끔 + 동시 작업 2개(대기 상한 초과는 즉시 거절)
sharp.concurrency(1)
sharp.cache(false)

// 디코딩 폭탄 방지: 4천만 화소(약 8000x5000) 초과 입력은 거부
const MAX_INPUT_PIXELS = 40_000_000
const JPEG_QUALITY = 82
const MAX_CONCURRENT_JOBS = 2
// 대기열 상한: 넘치면 503으로 바로 거절해 메모리(입력 버퍼)가 쌓이지 않게 한다
const MAX_WAITING_JOBS = 10
// 디코딩해 다시 인코딩할 입력 형식. HEIC·TIFF·GIF·SVG 등은 libvips 공격면을 줄이려고 받지 않는다(앱이 JPEG 후보를 만든다)
const ALLOWED_INPUT_FORMATS: ReadonlySet<string> = new Set(['jpeg', 'png', 'webp'])

export type SanitizedVariant = { buffer: Buffer; width: number; height: number }
export type SanitizedImage = { display: SanitizedVariant; thumb: SanitizedVariant }

export class InvalidImageError extends Error {
  constructor(reason: string) {
    super(`이미지를 해석할 수 없습니다: ${reason}`)
    this.name = 'InvalidImageError'
  }
}

export class SanitizerBusyError extends Error {
  constructor() {
    super('이미지 처리 대기열이 가득 찼습니다')
    this.name = 'SanitizerBusyError'
  }
}

// 동시 실행 수를 N개로 제한한다. 대기가 maxWaiting을 넘으면 SanitizerBusyError로 즉시 거절한다
export const createConcurrencyLimiter = (max: number, maxWaiting = Number.POSITIVE_INFINITY) => {
  let running = 0
  let waiting: ReadonlyArray<() => void> = []
  const acquire = (): Promise<void> => {
    if (running < max) {
      running += 1
      return Promise.resolve()
    }
    if (waiting.length >= maxWaiting) return Promise.reject(new SanitizerBusyError())
    return new Promise((resolve) => {
      waiting = [...waiting, resolve]
    })
  }
  // 대기자가 있으면 슬롯을 그대로 넘기고, 없으면 반납한다
  const release = (): void => {
    const [next, ...rest] = waiting
    waiting = rest
    if (next) next()
    else running -= 1
  }
  return async <T>(job: () => Promise<T>): Promise<T> => {
    // 거절(SanitizerBusyError)은 슬롯을 잡지 않았으므로 release 없이 그대로 올라간다
    await acquire()
    try {
      return await job()
    } finally {
      release()
    }
  }
}

// 헤더만 읽어 형식을 먼저 확인한다(전체 디코딩 전)
const assertAllowedFormat = async (input: Buffer): Promise<void> => {
  const { format } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()
  if (!format || !ALLOWED_INPUT_FORMATS.has(format)) throw new Error(`허용되지 않은 형식(${format ?? 'unknown'})`)
}

const reencode = async (input: Buffer, edge: number): Promise<SanitizedVariant> => {
  // withMetadata/keepMetadata를 부르지 않으면 EXIF·GPS·ICC·XMP를 전부 버린다.
  // .rotate()(인자 없음)로 회전 태그를 픽셀에 먼저 반영해 태그가 사라져도 방향이 유지된다
  const { data, info } = await sharp(input, { failOn: 'truncated', limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })
  return { buffer: data, width: info.width, height: info.height }
}

// EXIF 제거의 신뢰 경계는 서버(architecture §6.2). 기기가 만든 표시용 후보를 디코딩 검증 후 메타데이터 없이 다시 인코딩한다
@Injectable()
export class ImageSanitizer {
  private readonly limit = createConcurrencyLimiter(MAX_CONCURRENT_JOBS, MAX_WAITING_JOBS)

  sanitize(input: Buffer): Promise<SanitizedImage> {
    return this.limit(async () => {
      try {
        await assertAllowedFormat(input)
        const display = await reencode(input, DISPLAY_LONG_EDGE)
        const thumb = await reencode(display.buffer, THUMB_LONG_EDGE)
        return { display, thumb }
      } catch (error) {
        throw new InvalidImageError(error instanceof Error ? error.message : String(error))
      }
    })
  }
}
