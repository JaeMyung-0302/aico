import { DeleteObjectsCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { ConfigService } from '@nestjs/config'
import { R2ObjectStorage, s3ClientOptions } from './r2.client'

const r2Config = {
  accountId: 'acc123',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  publicBucket: 'miripet-public',
  privateBucket: 'miripet-private',
  publicBaseUrl: 'https://img.test',
  endpoint: '',
}

// 네트워크는 S3Client.send 하나로 모인다 → 그것만 대역으로 바꾼다. presign은 로컬 서명 계산이라 실제로 돈다
describe('R2ObjectStorage', () => {
  const storage = new R2ObjectStorage(new ConfigService({ r2: r2Config }))
  let send: jest.SpyInstance

  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send')
  })

  afterEach(() => jest.restoreAllMocks())

  it('r2 설정이 없으면 생성 시 예외', () => {
    expect(() => new R2ObjectStorage(new ConfigService({}))).toThrow('r2 설정이 없습니다')
  })

  it('presignGet: private 버킷 + 지정한 만료(60초)', async () => {
    const url = new URL(await storage.presignGet({ bucket: 'PRIVATE', key: 'c/u/m.jpg', expiresIn: 60 }))
    expect(url.hostname).toBe('miripet-private.acc123.r2.cloudflarestorage.com')
    expect(url.pathname).toBe('/c/u/m.jpg')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60')
    expect(send).not.toHaveBeenCalled()
  })

  it('presignPut: host만 서명한다(Android가 Content-Type·길이를 바꿔 보내도 통과, 내용은 complete에서 재검증) + 빈 본문 체크섬 없음', async () => {
    const url = new URL(
      await storage.presignPut({ bucket: 'PRIVATE', key: 'incoming/x', expiresIn: 300 }),
    )
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual(['host'])
    // SDK 기본값(flexible checksums)은 빈 본문의 CRC32를 서명해 R2가 실제 업로드를 거부한다
    expect([...url.searchParams.keys()].filter((key) => key.toLowerCase().includes('checksum'))).toEqual([])
  })

  it('getObject: 본문을 Buffer로 돌려준다', async () => {
    send.mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } })
    await expect(storage.getObject({ bucket: 'PRIVATE', key: 'incoming/x' })).resolves.toEqual(Buffer.from([1, 2, 3]))
    const command = send.mock.calls[0]?.[0]
    expect(command).toBeInstanceOf(GetObjectCommand)
    expect(command.input).toEqual({ Bucket: 'miripet-private', Key: 'incoming/x' })
  })

  it('getObject: 없는 키(NoSuchKey)·본문 없음은 null, 그 외 오류는 그대로', async () => {
    send.mockRejectedValueOnce(new NoSuchKey({ message: 'no', $metadata: { httpStatusCode: 404 } }))
    await expect(storage.getObject({ bucket: 'PRIVATE', key: 'a' })).resolves.toBeNull()
    send.mockResolvedValueOnce({})
    await expect(storage.getObject({ bucket: 'PRIVATE', key: 'b' })).resolves.toBeNull()
    send.mockRejectedValueOnce(new Error('network'))
    await expect(storage.getObject({ bucket: 'PRIVATE', key: 'c' })).rejects.toThrow('network')
  })

  it('putObject: 버킷 이름·캐시 헤더를 넣어 보낸다', async () => {
    send.mockResolvedValue({})
    await storage.putObject({
      bucket: 'PUBLIC',
      key: 'p/m/1440.jpg',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=1',
    })
    const command = send.mock.calls[0]?.[0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toMatchObject({
      Bucket: 'miripet-public',
      Key: 'p/m/1440.jpg',
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=1',
    })
  })

  it('deleteObjects: 버킷별로 묶어 1000개 단위로 지운다', async () => {
    send.mockResolvedValue({})
    const privateKeys = Array.from({ length: 1001 }, (_, i) => ({ bucket: 'PRIVATE' as const, key: `c/${i}.jpg` }))
    await storage.deleteObjects([{ bucket: 'PUBLIC', key: 'p/a/1440.jpg' }, ...privateKeys])

    const commands = send.mock.calls.map(([command]) => command)
    expect(commands.every((command) => command instanceof DeleteObjectsCommand)).toBe(true)
    const batches = commands.map((command) => ({
      bucket: command.input.Bucket,
      size: command.input.Delete.Objects.length,
    }))
    expect(batches).toEqual([
      { bucket: 'miripet-public', size: 1 },
      { bucket: 'miripet-private', size: 1000 },
      { bucket: 'miripet-private', size: 1 },
    ])
  })

  it('deleteObjects: 빈 목록이면 요청하지 않는다', async () => {
    await storage.deleteObjects([])
    expect(send).not.toHaveBeenCalled()
  })
})

describe('s3ClientOptions', () => {
  const base = {
    accountId: 'acc123',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    publicBucket: 'pub',
    privateBucket: 'priv',
    publicBaseUrl: '',
    endpoint: '',
  }

  it('기본은 Cloudflare R2 계정 엔드포인트(가상 호스트 방식)를 쓴다', () => {
    expect(s3ClientOptions(base)).toMatchObject({
      region: 'auto',
      endpoint: 'https://acc123.r2.cloudflarestorage.com',
      forcePathStyle: false,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  })

  it('R2_ENDPOINT가 있으면 로컬 S3 호환 저장소(MinIO)로 path-style 접속한다', () => {
    expect(s3ClientOptions({ ...base, endpoint: 'http://192.168.10.56:9439' })).toMatchObject({
      endpoint: 'http://192.168.10.56:9439',
      forcePathStyle: true,
    })
  })
})
