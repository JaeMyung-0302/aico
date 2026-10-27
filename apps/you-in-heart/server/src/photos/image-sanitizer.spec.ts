import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DISPLAY_LONG_EDGE, THUMB_LONG_EDGE } from '@you-in-heart/shared'
import sharp from 'sharp'
import {
  createConcurrencyLimiter,
  ImageSanitizer,
  InvalidImageError,
  PHOTO_MAX_INPUT_PIXELS,
  SanitizerBusyError,
  SCREENSHOT_MAX_INPUT_PIXELS,
} from './image-sanitizer'

const fixture = (name: string): Buffer => readFileSync(resolve(__dirname, '../../test/fixtures', name))

// GPS IFD 포인터 태그(0x8825, little-endian TIFF)
const GPS_POINTER_TAG = Buffer.from([0x25, 0x88])

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 1, g: 2, b: 3 } } })

const longEdge = ({ width = 0, height = 0 }: { width?: number; height?: number }) => Math.max(width, height)

describe('ImageSanitizer', () => {
  const sanitizer = new ImageSanitizer()
  // 입력은 limiter 안에서 load()로 읽는다. 기본은 사진 표시용 후보 화소 상한
  const run = (input: Buffer, maxInputPixels = PHOTO_MAX_INPUT_PIXELS) =>
    sanitizer.sanitize(() => Promise.resolve(input), maxInputPixels)

  it('libvips 스레드는 1개(sharp.concurrency(1))로 메모리 상한을 둔다', () => {
    expect(sharp.concurrency()).toBe(1)
  })

  it('fixture gps-exif.jpg 자체에는 EXIF·GPS·회전 6이 있다 (테스트 전제 확인)', async () => {
    const meta = await sharp(fixture('gps-exif.jpg')).metadata()
    expect(meta.exif?.includes(GPS_POINTER_TAG)).toBe(true)
    expect(meta.orientation).toBe(6)
    expect({ width: meta.width, height: meta.height }).toEqual({ width: 2400, height: 1600 })
  })

  it('gps-exif.jpg → 표시용·썸네일 모두 EXIF·GPS·ICC·XMP 없음, 긴 변 2048·400 이하 JPEG', async () => {
    const { display, thumb } = await run(fixture('gps-exif.jpg'))
    for (const [variant, edge] of [
      [display, DISPLAY_LONG_EDGE],
      [thumb, THUMB_LONG_EDGE],
    ] as const) {
      const meta = await sharp(variant.buffer).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.icc).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
      expect(meta.format).toBe('jpeg')
      expect(variant.buffer.includes(Buffer.from('YouInHeartTestCam'))).toBe(false)
      expect(longEdge(meta)).toBeLessThanOrEqual(edge)
    }
  })

  it('EXIF Orientation 6(가로 2400x1600)은 회전을 픽셀에 반영해 세로로 나온다', async () => {
    const { display, thumb } = await run(fixture('gps-exif.jpg'))
    expect(display.height).toBe(DISPLAY_LONG_EDGE)
    expect(Math.abs(display.width - 1365)).toBeLessThanOrEqual(1)
    expect(thumb.height).toBe(THUMB_LONG_EDGE)
    expect(thumb.width).toBeLessThan(thumb.height)
    expect((await sharp(display.buffer).metadata()).orientation).toBeUndefined()
  })

  it('작은 이미지(no-exif.jpg 64x48)는 키우지 않는다', async () => {
    const { display, thumb } = await run(fixture('no-exif.jpg'))
    expect({ width: display.width, height: display.height }).toEqual({ width: 64, height: 48 })
    expect({ width: thumb.width, height: thumb.height }).toEqual({ width: 64, height: 48 })
  })

  it('HEIC(sample.heic)·텍스트(not-image.txt)는 InvalidImageError', async () => {
    await expect(run(fixture('sample.heic'))).rejects.toBeInstanceOf(InvalidImageError)
    await expect(run(fixture('not-image.txt'))).rejects.toBeInstanceOf(InvalidImageError)
  })

  it('허용 형식(jpeg·png·webp)이 아닌 이미지(TIFF·GIF)는 디코딩 가능해도 InvalidImageError', async () => {
    await expect(run(await solid(64, 64).tiff().toBuffer())).rejects.toBeInstanceOf(InvalidImageError)
    await expect(run(await solid(64, 64).gif().toBuffer())).rejects.toBeInstanceOf(InvalidImageError)
  })

  it('PNG·WebP는 받아서 JPEG로 다시 인코딩한다', async () => {
    for (const input of [await solid(64, 48).png().toBuffer(), await solid(64, 48).webp().toBuffer()]) {
      const { display } = await run(input)
      expect((await sharp(display.buffer).metadata()).format).toBe('jpeg')
    }
  })

  it('잘린(손상된) JPEG도 InvalidImageError', async () => {
    const input = fixture('gps-exif.jpg')
    await expect(run(input.subarray(0, Math.floor(input.length / 2)))).rejects.toBeInstanceOf(
      InvalidImageError,
    )
  })

  it('화소 상한: 사진은 2048×2048×1.1, 스크린샷은 2048×8192. 넘으면 InvalidImageError(디코딩 폭탄)', async () => {
    expect([PHOTO_MAX_INPUT_PIXELS, SCREENSHOT_MAX_INPUT_PIXELS]).toEqual([Math.floor(2048 * 2048 * 1.1), 2048 * 8192])
    const square = await solid(2048, 2048).jpeg({ quality: 10 }).toBuffer()
    await expect(run(square)).resolves.toMatchObject({ display: { width: 2048, height: 2048 } })
    const tooBig = await solid(2200, 2200).jpeg({ quality: 10 }).toBuffer()
    await expect(run(tooBig)).rejects.toBeInstanceOf(InvalidImageError)
    const tall = await solid(1290, 8000).jpeg({ quality: 10 }).toBuffer()
    await expect(run(tall)).rejects.toBeInstanceOf(InvalidImageError)
    await expect(run(tall, SCREENSHOT_MAX_INPUT_PIXELS)).resolves.toMatchObject({ display: { height: 2048 } })
    const tooTall = await solid(2048, 8200).jpeg({ quality: 10 }).toBuffer()
    await expect(run(tooTall, SCREENSHOT_MAX_INPUT_PIXELS)).rejects.toBeInstanceOf(InvalidImageError)
  })

  it('load()는 실행 슬롯을 잡은 뒤에만 부른다 → 입력 버퍼는 실행 중 작업 수(2)만큼만 존재', async () => {
    const limited = new ImageSanitizer()
    const input = await solid(64, 48).jpeg().toBuffer()
    const gates: Array<() => void> = []
    const blockedLoad = () =>
      new Promise<Buffer>((resolve) => {
        gates.push(() => resolve(input))
      })
    const loads = [jest.fn(blockedLoad), jest.fn(blockedLoad), jest.fn(blockedLoad)]
    const jobs = loads.map((load) => limited.sanitize(load, PHOTO_MAX_INPUT_PIXELS))
    await new Promise((resolve) => setImmediate(resolve))
    expect(loads.map((load) => load.mock.calls.length)).toEqual([1, 1, 0])
    gates.shift()?.()
    await jobs[0]
    await new Promise((resolve) => setImmediate(resolve))
    expect(loads[2]?.mock.calls.length).toBe(1)
    gates.splice(0).forEach((open) => open())
    await Promise.all(jobs)
  })

  it('대기열(실행 2 + 대기 10)이 가득 차면 load()를 부르지 않고 SanitizerBusyError', async () => {
    const limited = new ImageSanitizer()
    const input = await solid(64, 48).jpeg().toBuffer()
    let open: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      open = resolve
    })
    const gatedLoad = () => gate.then(() => input)
    const jobs = Array.from({ length: 12 }, () => limited.sanitize(gatedLoad, PHOTO_MAX_INPUT_PIXELS))
    const rejectedLoad = jest.fn(gatedLoad)
    await expect(limited.sanitize(rejectedLoad, PHOTO_MAX_INPUT_PIXELS)).rejects.toBeInstanceOf(SanitizerBusyError)
    expect(rejectedLoad).not.toHaveBeenCalled()
    open()
    await Promise.all(jobs)
  })

  it('load() 실패는 InvalidImageError로 감싸지 않고 그대로 올린다(슬롯은 돌려준다)', async () => {
    const limited = new ImageSanitizer()
    const missing = new Error('upload incomplete')
    await expect(limited.sanitize(() => Promise.reject(missing), PHOTO_MAX_INPUT_PIXELS)).rejects.toBe(missing)
    await expect(run(fixture('no-exif.jpg'))).resolves.toBeDefined()
  })
})

describe('createConcurrencyLimiter', () => {
  it('동시에 최대 N개만 실행하고 나머지는 차례를 기다린다', async () => {
    const limit = createConcurrencyLimiter(2)
    let running = 0
    let peak = 0
    const task = () =>
      limit(async () => {
        running += 1
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 5))
        running -= 1
        return running
      })
    await Promise.all([task(), task(), task(), task(), task()])
    expect(peak).toBe(2)
  })

  it('대기열이 maxWaiting을 넘으면 SanitizerBusyError로 즉시 거절한다(실행 중 작업은 그대로 끝난다)', async () => {
    const limit = createConcurrencyLimiter(1, 1)
    let release: () => void = () => undefined
    const blocker = new Promise<void>((resolve) => {
      release = resolve
    })
    const running = limit(() => blocker.then(() => 'first'))
    const waiting = limit(() => Promise.resolve('second'))
    await expect(limit(() => Promise.resolve('third'))).rejects.toBeInstanceOf(SanitizerBusyError)
    release()
    await expect(running).resolves.toBe('first')
    await expect(waiting).resolves.toBe('second')
    await expect(limit(() => Promise.resolve('after'))).resolves.toBe('after')
  })

  it('작업이 실패해도 슬롯을 돌려준다', async () => {
    const limit = createConcurrencyLimiter(1)
    await expect(limit(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await expect(limit(() => Promise.resolve('ok'))).resolves.toBe('ok')
  })
})
