import type { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import sharp from 'sharp'
import request from 'supertest'
import type { ObjectStorage, StoredObject } from '../../src/media/object-storage'
import { R2ObjectStorage } from '../../src/media/r2.client'
import type { PrismaService } from '../../src/prisma/prisma.service'
import { bearer } from './auth-helpers'

const objectId = ({ bucket, key }: StoredObject) => `${bucket}:${key}`

// R2 대역: 객체는 메모리에 두고, presigned URL은 실제 S3 서명기(로컬 계산, 네트워크 없음)로 만든다
export const createInMemoryStorage = () => {
  const presigner = new R2ObjectStorage(
    new ConfigService({
      r2: {
        accountId: 'test-account',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        publicBucket: 'miripet-public',
        privateBucket: 'miripet-private',
        publicBaseUrl: 'https://img.test',
        endpoint: '',
      },
    }),
  )
  let objects: ReadonlyMap<string, Buffer> = new Map()
  const storage = {
    presignPut: jest.fn((input: Parameters<ObjectStorage['presignPut']>[0]) => presigner.presignPut(input)),
    presignGet: jest.fn((input: Parameters<ObjectStorage['presignGet']>[0]) => presigner.presignGet(input)),
    getObject: jest.fn(async (input: StoredObject) => objects.get(objectId(input)) ?? null),
    putObject: jest.fn(async (input: Parameters<ObjectStorage['putObject']>[0]) => {
      objects = new Map([...objects, [objectId(input), input.body]])
    }),
    deleteObjects: jest.fn(async (targets: readonly StoredObject[]) => {
      const removed = new Set(targets.map(objectId))
      objects = new Map([...objects].filter(([id]) => !removed.has(id)))
    }),
  } satisfies ObjectStorage
  return {
    storage,
    has: (target: StoredObject) => objects.has(objectId(target)),
    read: (target: StoredObject) => objects.get(objectId(target)) ?? null,
    keys: () => [...objects.keys()],
    reset: () => {
      objects = new Map()
      Object.values(storage).forEach((fn) => fn.mockClear())
    },
  }
}

export type InMemoryStorage = ReturnType<typeof createInMemoryStorage>

// GPS EXIF가 들어 있는 실제 JPEG
export const createGpsJpeg = (width = 1600, height = 1200): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 90, g: 140, b: 200 } } })
    .jpeg()
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

// 앱 흐름 그대로: presign → (클라이언트 PUT 대신 메모리에 넣기) → complete
export const uploadImage = async (
  app: INestApplication,
  prisma: PrismaService,
  memory: InMemoryStorage,
  accessToken: string,
  purpose: 'AVATAR' | 'CERTIFICATE' | 'POST' | 'DM' | 'PLACE_REPORT',
  body?: Buffer,
): Promise<string> => {
  const bytes = body ?? (await createGpsJpeg())
  const presign = await request(app.getHttpServer())
    .post('/api/v1/media/uploads')
    .set(...bearer(accessToken))
    .send({ purpose, mime: 'image/jpeg', bytes: bytes.length })
    .expect(201)
  const media = await prisma.media.findUniqueOrThrow({ where: { id: presign.body.mediaId } })
  await memory.storage.putObject({ bucket: 'PRIVATE', key: media.key, body: bytes, contentType: 'image/jpeg' })
  await request(app.getHttpServer())
    .post(`/api/v1/media/${media.id}/complete`)
    .set(...bearer(accessToken))
    .expect(200)
  return media.id
}
