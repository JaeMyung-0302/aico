import { toLegalUrl } from '../legal-urls'

describe('toLegalUrl', () => {
  it('API base URL에서 /api/v1을 떼고 서버의 /legal 문서 주소를 만든다', () => {
    expect(toLegalUrl('https://api.miripet.app/api/v1', 'terms')).toBe('https://api.miripet.app/legal/terms')
    expect(toLegalUrl('http://localhost:4008/api/v1/', 'privacy')).toBe('http://localhost:4008/legal/privacy')
  })

  it('버전 경로가 없으면 그대로 origin으로 쓴다', () => {
    expect(toLegalUrl('http://10.0.2.2:4008', 'location')).toBe('http://10.0.2.2:4008/legal/location')
  })
})
