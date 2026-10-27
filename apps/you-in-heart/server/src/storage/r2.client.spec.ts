import { ConfigService } from '@nestjs/config'
import { configuration } from '../config/configuration'
import { R2ObjectStorage } from './r2.client'

// presign은 로컬 HMAC 계산이라 네트워크 없이 URL 모양을 검사할 수 있다
const createStorage = () => {
  const base = configuration()
  return new R2ObjectStorage(
    new ConfigService({
      r2: { ...base.r2, endpoint: 'http://localhost:9440', accessKeyId: 'test', secretAccessKey: 'test-secret' },
    }),
  )
}

const params = (url: string) => new URL(url).searchParams

describe('R2ObjectStorage presign', () => {
  it('원본 PUT은 content-length·content-type을 서명하고 만료는 요청값', async () => {
    const url = await createStorage().presignPut({
      key: 'c/x/p/y/o',
      contentType: 'image/heic',
      contentLength: 1234,
      expiresIn: 300,
    })
    expect(params(url).get('X-Amz-Expires')).toBe('300')
    expect(params(url).get('X-Amz-SignedHeaders')?.split(';').sort()).toEqual([
      'content-length',
      'content-type',
      'host',
    ])
    expect(new URL(url).pathname).toBe('/youinheart-private/c/x/p/y/o')
  })

  it('크기를 모르는 표시용 후보 PUT은 content-type만 서명', async () => {
    const url = await createStorage().presignPut({ key: 'incoming/x/y', contentType: 'image/jpeg', expiresIn: 300 })
    expect(params(url).get('X-Amz-SignedHeaders')?.split(';').sort()).toEqual(['content-type', 'host'])
  })

  it('GET은 만료(3600·300초)를 그대로 담는다', async () => {
    const storage = createStorage()
    expect(params(await storage.presignGet('c/x/p/y/t.jpg', 3600)).get('X-Amz-Expires')).toBe('3600')
    expect(params(await storage.presignGet('c/x/p/y/o', 300)).get('X-Amz-Expires')).toBe('300')
  })
})
