import sharp from 'sharp'
import { createConcurrencyLimiter, ImageSanitizer, InvalidImageError, SanitizerBusyError } from './image-sanitizer'

// 실제 JPEG fixture: EXIF(카메라 제조사 + GPS IFD) + 회전 태그(6 = 90° 시계 방향)
const createGpsExifJpeg = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExif({
      IFD0: { Make: 'MiriTestCam' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '37/1 33/1 59/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '126/1 58/1 40/1',
      },
    })
    .toBuffer()

// GPS IFD 포인터 태그(0x8825, little-endian TIFF)
const GPS_POINTER_TAG = Buffer.from([0x25, 0x88])

describe('ImageSanitizer', () => {
  const sanitizer = new ImageSanitizer()

  it('fixture 자체에는 EXIF·GPS가 있다 (테스트 전제 확인)', async () => {
    const input = await createGpsExifJpeg(2400, 1600)
    const meta = await sharp(input).metadata()
    expect(meta.exif?.includes(GPS_POINTER_TAG)).toBe(true)
    expect(meta.orientation).toBe(6)
  })

  it('EXIF·GPS를 모두 지우고 긴 변을 1440 이하로 줄인다', async () => {
    const input = await createGpsExifJpeg(2400, 1600)
    const { main, thumb } = await sanitizer.sanitize(input)

    const mainMeta = await sharp(main.buffer).metadata()
    expect(mainMeta.exif).toBeUndefined()
    expect(mainMeta.icc).toBeUndefined()
    expect(mainMeta.xmp).toBeUndefined()
    expect(main.buffer.includes(Buffer.from('MiriTestCam'))).toBe(false)
    expect(mainMeta.format).toBe('jpeg')
    expect(Math.max(mainMeta.width ?? 0, mainMeta.height ?? 0)).toBeLessThanOrEqual(1440)

    const thumbMeta = await sharp(thumb.buffer).metadata()
    expect(thumbMeta.exif).toBeUndefined()
    expect(Math.max(thumbMeta.width ?? 0, thumbMeta.height ?? 0)).toBeLessThanOrEqual(480)
  })

  it('회전 태그를 픽셀에 반영한다 (가로 2400x1600 + 회전 6 → 세로 960x1440)', async () => {
    const { main } = await sanitizer.sanitize(await createGpsExifJpeg(2400, 1600))
    expect({ width: main.width, height: main.height }).toEqual({ width: 960, height: 1440 })
    const meta = await sharp(main.buffer).metadata()
    expect(meta.orientation).toBeUndefined()
  })

  it('작은 이미지는 키우지 않는다', async () => {
    const { main, thumb } = await sanitizer.sanitize(await createGpsExifJpeg(300, 200))
    expect({ width: main.width, height: main.height }).toEqual({ width: 200, height: 300 })
    expect({ width: thumb.width, height: thumb.height }).toEqual({ width: 200, height: 300 })
  })

  it('이미지가 아닌 바이트는 InvalidImageError', async () => {
    await expect(sanitizer.sanitize(Buffer.from('not an image at all'))).rejects.toBeInstanceOf(InvalidImageError)
  })

  it('허용 형식(jpeg·png·webp)이 아닌 이미지(TIFF·GIF)는 디코딩 가능해도 InvalidImageError', async () => {
    const solid = () => sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    await expect(sanitizer.sanitize(await solid().tiff().toBuffer())).rejects.toBeInstanceOf(InvalidImageError)
    await expect(sanitizer.sanitize(await solid().gif().toBuffer())).rejects.toBeInstanceOf(InvalidImageError)
  })

  it('PNG·WebP는 받아서 JPEG로 다시 인코딩한다', async () => {
    const solid = () => sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    for (const input of [await solid().png().toBuffer(), await solid().webp().toBuffer()]) {
      const { main } = await sanitizer.sanitize(input)
      expect((await sharp(main.buffer).metadata()).format).toBe('jpeg')
    }
  })

  it('잘린(손상된) JPEG도 InvalidImageError', async () => {
    const input = await createGpsExifJpeg(800, 600)
    await expect(sanitizer.sanitize(input.subarray(0, Math.floor(input.length / 2)))).rejects.toBeInstanceOf(
      InvalidImageError,
    )
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
