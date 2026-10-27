import { randomBytes } from 'node:crypto'
import { PassThrough, Readable, Writable } from 'node:stream'
import { readZip } from '../../test/helpers/read-zip'
import { writeExportZip, type ZipSource } from './export-zip'

const MB = 1024 * 1024
const CHUNK = 64 * 1024
const OBJECT_COUNT = 200
const RSS_LIMIT = 150 * MB

// 1MB 객체를 64KB씩 흘려보내는 원본 스트림(압축되지 않는 무작위 바이트, 이미 압축된 사진과 비슷하게)
const oneMegabyte = (): Readable =>
  Readable.from(
    (function* chunks() {
      for (let sent = 0; sent < MB; sent += CHUNK) yield randomBytes(CHUNK)
    })(),
  )

// 받은 바이트를 버리고 크기만 센다(업로드 대역). 느린 소비자를 흉내 내 배압이 걸리게 한다
const countingSink = () => {
  let bytes = 0
  const sink = new Writable({
    highWaterMark: CHUNK,
    write(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length
      setImmediate(callback)
    },
  })
  return { sink, bytes: () => bytes }
}

const collect = (stream: PassThrough): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    let chunks: readonly Buffer[] = []
    stream.on('data', (chunk: Buffer) => {
      chunks = [...chunks, chunk]
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })

describe('writeExportZip', () => {
  it('entries.json과 파일을 순서대로 담고, 원본이 없는 파일은 건너뛰어 개수를 돌려준다', async () => {
    const sink = new PassThrough()
    const zipped = collect(sink)
    const sources: ZipSource[] = [
      { name: 'photos/2026-09-01/a.jpg', open: async () => Readable.from([Buffer.from('AAA')]) },
      { name: 'photos/2026-09-02/b.heic', open: async () => null },
      { name: 'photos/2026-09-03/c.png', open: async () => Readable.from([Buffer.from('CCCC')]) },
    ]
    const result = await writeExportZip({ manifest: { v: 1 }, sources, sink })
    expect(result).toEqual({ written: 2, missing: 1 })
    const files = readZip(await zipped)
    expect([...files.keys()]).toEqual(['entries.json', 'photos/2026-09-01/a.jpg', 'photos/2026-09-03/c.png'])
    expect(JSON.parse(files.get('entries.json')?.toString('utf8') ?? '')).toEqual({ v: 1 })
    expect(files.get('photos/2026-09-03/c.png')?.toString()).toBe('CCCC')
  })

  it('원본 스트림 오류는 zip 작성을 실패시킨다', async () => {
    const { sink } = countingSink()
    const broken = new Readable({ read: () => undefined })
    const open = async () => {
      setImmediate(() => broken.destroy(new Error('network reset')))
      return broken
    }
    await expect(writeExportZip({ manifest: {}, sources: [{ name: 'photos/x.jpg', open }], sink })).rejects.toThrow(
      'network reset',
    )
  })

  it('이미 실패한 원본 스트림도 멈추지 않고 실패시킨다', async () => {
    const { sink } = countingSink()
    const broken = new Readable({ read: () => undefined })
    broken.on('error', () => undefined)
    broken.destroy(new Error('already failed'))
    const sources: ZipSource[] = [{ name: 'photos/x.jpg', open: async () => broken }]
    await expect(writeExportZip({ manifest: {}, sources, sink })).rejects.toThrow('already failed')
  })

  it(`1MB 객체 ${OBJECT_COUNT}개를 스트리밍해도 RSS 증가가 150MB 미만`, async () => {
    const { sink, bytes } = countingSink()
    const opened = { count: 0, peakOpen: 0, open: 0 }
    const sources: ZipSource[] = Array.from({ length: OBJECT_COUNT }, (_, index) => ({
      name: `photos/2026-01-01/${index}.jpg`,
      open: async () => {
        opened.count += 1
        opened.open += 1
        opened.peakOpen = Math.max(opened.peakOpen, opened.open)
        const stream = oneMegabyte()
        stream.on('end', () => {
          opened.open -= 1
        })
        return stream
      },
    }))
    const baseline = process.memoryUsage().rss
    let peak = baseline
    const sampler = setInterval(() => {
      peak = Math.max(peak, process.memoryUsage().rss)
    }, 10)
    try {
      await writeExportZip({ manifest: { v: 1 }, sources, sink })
    } finally {
      clearInterval(sampler)
    }
    peak = Math.max(peak, process.memoryUsage().rss)
    const growth = peak - baseline
    process.stdout.write(
      `export-zip memory: rss growth ${(growth / MB).toFixed(1)}MB, zip ${(bytes() / MB).toFixed(1)}MB, peak open ${opened.peakOpen}\n`,
    )
    expect(opened.count).toBe(OBJECT_COUNT)
    expect(opened.peakOpen).toBe(1)
    expect(bytes()).toBeGreaterThan(OBJECT_COUNT * MB)
    expect(growth).toBeLessThan(RSS_LIMIT)
  }, 120_000)
})
