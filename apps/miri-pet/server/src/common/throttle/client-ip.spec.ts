import { parseTrustProxyHops, resolveClientIp } from './client-ip'

describe('resolveClientIp', () => {
  it('trust proxy > 0이면 cf-connecting-ip를 우선한다', () => {
    const req = {
      ip: '10.0.0.2',
      headers: { 'cf-connecting-ip': '203.0.113.7' },
    }
    expect(resolveClientIp(req, 2)).toBe('203.0.113.7')
  })

  it('trust proxy > 0이어도 cf-connecting-ip가 없거나 비어 있으면 req.ip', () => {
    expect(resolveClientIp({ ip: '10.0.0.2', headers: {} }, 2)).toBe('10.0.0.2')
    expect(resolveClientIp({ ip: '10.0.0.2', headers: { 'cf-connecting-ip': '  ' } }, 2)).toBe('10.0.0.2')
  })

  it('trust proxy = 0이면 cf-connecting-ip를 무시한다(위조 방지)', () => {
    const req = {
      ip: '198.51.100.1',
      headers: { 'cf-connecting-ip': '203.0.113.7' },
    }
    expect(resolveClientIp(req, 0)).toBe('198.51.100.1')
  })

  it('헤더가 배열이면 첫 값을 쓴다', () => {
    const req = {
      ip: '10.0.0.2',
      headers: { 'cf-connecting-ip': ['203.0.113.9', '203.0.113.10'] },
    }
    expect(resolveClientIp(req, 1)).toBe('203.0.113.9')
  })

  it('ip를 알 수 없으면 빈 문자열이 아닌 고정 키', () => {
    expect(resolveClientIp({ headers: {} }, 0)).toBe('unknown')
  })
})

describe('parseTrustProxyHops', () => {
  it.each([
    [undefined, 0],
    ['', 0],
    ['0', 0],
    ['2', 2],
    ['-1', 0],
    ['1.5', 0],
    ['abc', 0],
  ])('%p → %p', (raw, expected) => {
    expect(parseTrustProxyHops(raw)).toBe(expected)
  })
})
