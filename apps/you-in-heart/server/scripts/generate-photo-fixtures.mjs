// 사진 파이프라인 테스트 픽스처(test/fixtures)를 결정적으로 만든다: node scripts/generate-photo-fixtures.mjs
// gps-exif.jpg: 2400x1600, EXIF Orientation 6 + GPS IFD(서울 37°33'59"N 126°58'40"E) + 제조사 태그
// no-exif.jpg: 64x48, 메타데이터 없음 / sample.heic: ftyp heic 상자만 있는 최소 파일(sharp 디코딩 불가)
// not-image.txt: 텍스트
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const OUT = resolve(import.meta.dirname, '../test/fixtures')

const solid = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } })

const gpsExif = await solid(2400, 1600)
  .jpeg({ quality: 40 })
  .withMetadata({ orientation: 6 })
  .withExif({
    IFD0: { Make: 'YouInHeartTestCam' },
    IFD3: {
      GPSLatitudeRef: 'N',
      GPSLatitude: '37/1 33/1 59/1',
      GPSLongitudeRef: 'E',
      GPSLongitude: '126/1 58/1 40/1',
    },
  })
  .toBuffer()
writeFileSync(resolve(OUT, 'gps-exif.jpg'), gpsExif)

writeFileSync(resolve(OUT, 'no-exif.jpg'), await solid(64, 48).jpeg({ quality: 80 }).toBuffer())

// ISO BMFF: [size=24]['ftyp']['heic'][minor=0]['mif1']['heic'] + 빈 meta 상자 자리
const heic = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypheic', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('mif1heic', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x08]),
  Buffer.from('meta', 'ascii'),
])
writeFileSync(resolve(OUT, 'sample.heic'), heic)

writeFileSync(resolve(OUT, 'not-image.txt'), 'this is not an image\n')
