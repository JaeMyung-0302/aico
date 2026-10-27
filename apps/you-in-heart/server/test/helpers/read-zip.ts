import { inflateRawSync } from 'node:zlib'

// 테스트 전용 최소 zip 리더: End of Central Directory → Central Directory → 각 Local Header 뒤 데이터.
// 저장(0)·deflate(8)만 지원, ZIP64 미지원(테스트 zip은 작다)
const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_HEADER_SIZE = 30
const CENTRAL_HEADER_SIZE = 46

const findEocd = (zip: Buffer): number => {
  const start = Math.max(0, zip.length - 22 - 0xffff)
  const offsets = Array.from({ length: zip.length - 22 - start + 1 }, (_, index) => zip.length - 22 - index)
  const found = offsets.find((offset) => zip.readUInt32LE(offset) === EOCD_SIGNATURE)
  if (found === undefined) throw new Error('zip EOCD를 찾지 못했습니다')
  return found
}

const readEntry = (zip: Buffer, central: number): { name: string; data: Buffer; next: number } => {
  if (zip.readUInt32LE(central) !== CENTRAL_SIGNATURE) throw new Error('central directory가 깨졌습니다')
  const method = zip.readUInt16LE(central + 10)
  const compressedSize = zip.readUInt32LE(central + 20)
  const nameLength = zip.readUInt16LE(central + 28)
  const extraLength = zip.readUInt16LE(central + 30)
  const commentLength = zip.readUInt16LE(central + 32)
  const localOffset = zip.readUInt32LE(central + 42)
  const name = zip.subarray(central + CENTRAL_HEADER_SIZE, central + CENTRAL_HEADER_SIZE + nameLength).toString('utf8')
  const localNameLength = zip.readUInt16LE(localOffset + 26)
  const localExtraLength = zip.readUInt16LE(localOffset + 28)
  const dataStart = localOffset + LOCAL_HEADER_SIZE + localNameLength + localExtraLength
  const raw = zip.subarray(dataStart, dataStart + compressedSize)
  const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw)
  return { name, data, next: central + CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength }
}

export const readZip = (zip: Buffer): Map<string, Buffer> => {
  const eocd = findEocd(zip)
  const count = zip.readUInt16LE(eocd + 10)
  const first = zip.readUInt32LE(eocd + 16)
  const collect = (index: number, offset: number, acc: ReadonlyMap<string, Buffer>): ReadonlyMap<string, Buffer> => {
    if (index === count) return acc
    const { name, data, next } = readEntry(zip, offset)
    return collect(index + 1, next, new Map([...acc, [name, data]]))
  }
  return new Map(collect(0, first, new Map()))
}
