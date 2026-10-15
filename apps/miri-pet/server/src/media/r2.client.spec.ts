import { DeleteObjectsCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { ConfigService } from '@nestjs/config'
import { R2ObjectStorage } from './r2.client'

const r2Config = {
  accountId: 'acc123',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  publicBucket: 'miripet-public',
  privateBucket: 'miripet-private',
  publicBaseUrl: 'https://img.test',
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

  it('presignPut: Content-Type·Content-Length를 서명 헤더에 고정', async () => {
    const url = new URL(
      await storage.presignPut({
        bucket: 'PRIVATE',
        key: 'incoming/x',
        contentType: 'image/jpeg',
        contentLength: 1234,
        expiresIn: 300,
      }),
    )
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual(
      expect.arrayContaining(['content-length', 'content-type', 'host']),
    )
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
