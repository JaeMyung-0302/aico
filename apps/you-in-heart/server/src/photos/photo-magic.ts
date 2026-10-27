import type { OriginalMime } from '@you-in-heart/shared'

// 원본은 디코딩하지 않는다(HEIC는 sharp 기본 바이너리로 못 읽음). 앞 16바이트 매직 넘버가 선언한 형식과 맞는지만 본다
export const MAGIC_BYTES = 16

const JPEG = Buffer.from([0xff, 0xd8, 0xff])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// ISO BMFF: [4바이트 크기]['ftyp'][major brand]
const FTYP = Buffer.from('ftyp', 'ascii')
const HEIF_BRANDS: ReadonlySet<string> = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'])

const isJpeg = (head: Buffer): boolean => head.subarray(0, JPEG.length).equals(JPEG)
const isPng = (head: Buffer): boolean => head.subarray(0, PNG.length).equals(PNG)
const isHeif = (head: Buffer): boolean =>
  head.subarray(4, 8).equals(FTYP) && HEIF_BRANDS.has(head.subarray(8, 12).toString('ascii'))

const CHECKS: Record<OriginalMime, (head: Buffer) => boolean> = {
  'image/jpeg': isJpeg,
  'image/png': isPng,
  'image/heic': isHeif,
  'image/heif': isHeif,
}

export const matchesOriginalMime = (head: Buffer, mime: OriginalMime): boolean => CHECKS[mime](head)
