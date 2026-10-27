import { once } from 'node:events'
import type { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import archiver, { type Archiver } from 'archiver'
import { sequentially } from '../common/async/sequentially'

// zip 안 파일 하나. open은 차례가 왔을 때만 호출한다(원본을 한 번에 하나씩만 연다). 원본이 없으면 null
export type ZipSource = { name: string; open: () => Promise<Readable | null> }

export type ZipResult = { written: number; missing: number }

type WriteZipInput = { manifest: unknown; sources: readonly ZipSource[]; sink: Writable }

// 원본 스트림이 실패하면 거부. 이미 실패·종료된 스트림은 archiver가 끝을 기다리며 멈추므로 바로 거부한다
const streamFailure = (stream: Readable, signal: AbortSignal): Promise<never> => {
  if (stream.errored || stream.destroyed) {
    return Promise.reject(stream.errored ?? new Error('원본 스트림이 이미 닫혔습니다'))
  }
  return once(stream, 'error', { signal }).then(([error]: unknown[]) => {
    throw error instanceof Error ? error : new Error('원본 스트림 오류')
  })
}

// 항목 하나가 zip에 다 들어갈 때까지 기다린다. 원본 스트림 오류·archiver 오류는 거부로 올린다
const appendAndWait = async (archive: Archiver, source: Readable | Buffer, name: string): Promise<void> => {
  const controller = new AbortController()
  const failed = Buffer.isBuffer(source)
    ? new Promise<never>(() => undefined)
    : streamFailure(source, controller.signal)
  const entered = once(archive, 'entry', { signal: controller.signal })
  try {
    archive.append(source, { name })
    await Promise.race([failed, entered])
  } finally {
    controller.abort()
  }
}

// 내보내기 zip(architecture §5.3): entries.json + 원본 사진을 스트리밍으로 sink에 쓴다.
// 사진은 이미 압축돼 있어 store(무압축). 메모리는 스트림 버퍼 몇 개 수준이고 원본 수와 무관하다
export const writeExportZip = async ({ manifest, sources, sink }: WriteZipInput): Promise<ZipResult> => {
  const archive = archiver('zip', { store: true })
  const piping = pipeline(archive, sink)
  try {
    await appendAndWait(archive, Buffer.from(JSON.stringify(manifest)), 'entries.json')
    const outcomes = await sequentially(sources, async ({ name, open }) => {
      const stream = await open()
      if (!stream) return 'missing' as const
      await appendAndWait(archive, stream, name)
      return 'written' as const
    })
    await Promise.all([archive.finalize(), piping])
    return {
      written: outcomes.filter((outcome) => outcome === 'written').length,
      missing: outcomes.filter((outcome) => outcome === 'missing').length,
    }
  } catch (error) {
    // abort()는 멈춘 원본을 기다릴 수 있다 → destroy로 pipeline을 끊고 sink(업로드)도 함께 실패시킨다
    archive.destroy(error instanceof Error ? error : new Error('zip 작성 실패'))
    await piping.catch(() => undefined)
    throw error
  }
}
