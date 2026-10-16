import { ConfigService } from '@nestjs/config'
import { KAKAO_UNLINK_URL, KakaoUnlinkClient } from './kakao-unlink.client'

describe('KakaoUnlinkClient', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Admin 키로 user_id 기준 unlink를 호출한다', async () => {
    fetchMock.mockResolvedValue(new Response('{"id":123}', { status: 200 }))
    const client = new KakaoUnlinkClient(new ConfigService({ kakao: { adminKey: 'admin-key' } }))

    await client.unlink('123')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(KAKAO_UNLINK_URL)
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('KakaoAK admin-key')
    expect(String(init.body)).toBe('target_id_type=user_id&target_id=123')
  })

  it('카카오가 실패 응답을 주면 예외', async () => {
    fetchMock.mockResolvedValue(new Response('{"code":-101}', { status: 400 }))
    const client = new KakaoUnlinkClient(new ConfigService({ kakao: { adminKey: 'admin-key' } }))
    await expect(client.unlink('123')).rejects.toThrow('400')
  })

  it('Admin 키가 없으면 호출하지 않고 예외', async () => {
    const client = new KakaoUnlinkClient(new ConfigService({ kakao: { adminKey: '' } }))
    await expect(client.unlink('123')).rejects.toThrow('KAKAO_ADMIN_KEY')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
