import { ConfigService } from '@nestjs/config'
import { JWT_MIN_SECRET_BYTES, resolveJwtOptions } from './auth.module'

describe('resolveJwtOptions', () => {
  it('JWT_SECRET이 없으면 부팅 실패', () => {
    expect(() => resolveJwtOptions(new ConfigService({ jwtSecret: '' }))).toThrow('JWT_SECRET')
  })

  it('32바이트 미만이면 부팅 실패', () => {
    expect(JWT_MIN_SECRET_BYTES).toBe(32)
    expect(() => resolveJwtOptions(new ConfigService({ jwtSecret: 'x'.repeat(31) }))).toThrow('32')
  })

  it('바이트 기준으로 센다(한글 11자 = 33바이트는 통과)', () => {
    expect(() => resolveJwtOptions(new ConfigService({ jwtSecret: '가'.repeat(11) }))).not.toThrow()
  })

  it('32바이트 이상이면 HS256으로 서명·검증을 고정한다', () => {
    const secret = 'y'.repeat(32)
    expect(resolveJwtOptions(new ConfigService({ jwtSecret: secret }))).toEqual({
      secret,
      signOptions: { algorithm: 'HS256' },
      verifyOptions: { algorithms: ['HS256'] },
    })
  })
})
