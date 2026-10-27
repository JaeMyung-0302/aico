import { Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { generateSecret, SignJWT, UnsecuredJWT } from 'jose'
import { createTestIdTokenKit, type TestIdTokenKit } from '../../test/helpers/id-token-test-keys'
import { createRemoteJwksResolver, IdTokenVerifier, KAKAO_ISSUER } from './id-token-verifier'

const KAKAO_APP_KEY = 'kakao-native-app-key'

const makeConfig = (kakaoKey = KAKAO_APP_KEY) => new ConfigService({ kakao: { nativeAppKey: kakaoKey } })

describe('IdTokenVerifier', () => {
  let kit: TestIdTokenKit
  let verifier: IdTokenVerifier

  beforeAll(async () => {
    kit = await createTestIdTokenKit()
  })

  beforeEach(() => {
    verifier = new IdTokenVerifier(() => kit.jwks, makeConfig())
  })

  it('카카오: 서명·iss·aud가 맞으면 sub를 돌려준다', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '12345' })
    await expect(verifier.verify('KAKAO', token)).resolves.toEqual({ provider: 'KAKAO', sub: '12345' })
  })

  it('iss가 다르면 401', async () => {
    const token = await kit.sign({ iss: 'https://evil.example.com', aud: KAKAO_APP_KEY, sub: '1' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('aud가 다르면 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: 'other-app', sub: '1' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('RS256이 아닌 알고리즘(HS256 대칭키 위조)은 401', async () => {
    const forged = await new SignJWT({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' })
      .setProtectedHeader({ alg: 'HS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(await generateSecret('HS256'))
    await expect(verifier.verify('KAKAO', forged)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('서명 없는 토큰(alg: none)은 401', async () => {
    const unsigned = new UnsecuredJWT({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .encode()
    await expect(verifier.verify('KAKAO', unsigned)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('만료된 토큰은 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' }, { expiresIn: '-1m' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('exp가 남아 있어도 발급(iat) 후 10분이 지난 토큰은 401(재사용 방지)', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 11 * 60
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' }, { issuedAt, expiresIn: '1h' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('발급 9분 된 토큰은 통과', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 9 * 60
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '9' }, { issuedAt, expiresIn: '1h' })
    await expect(verifier.verify('KAKAO', token)).resolves.toEqual({ provider: 'KAKAO', sub: '9' })
  })

  it('JWKS에 없는 키로 서명하면 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' }, { useForeignKey: true })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('sub가 없으면 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('형식이 깨진 토큰은 401', async () => {
    await expect(verifier.verify('KAKAO', 'not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('앱 키가 비어 있으면(미설정) 어떤 토큰도 거부하고, 일반 401 메시지만 주며 서버 로그에 원인을 남긴다', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    try {
      const strict = new IdTokenVerifier(() => kit.jwks, makeConfig(''))
      const emptyAud = await kit.sign({ iss: KAKAO_ISSUER, aud: '', sub: '1' })
      const unconfigured: unknown = await strict.verify('KAKAO', emptyAud).catch((caught: unknown) => caught)
      const forged: unknown = await verifier.verify('KAKAO', 'not-a-jwt').catch((caught: unknown) => caught)

      expect(unconfigured).toBeInstanceOf(UnauthorizedException)
      expect(unconfigured instanceof UnauthorizedException && unconfigured.message).toBe(
        forged instanceof UnauthorizedException && forged.message,
      )
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('KAKAO'))
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('검증 실패 로그·에러에 id_token 원문을 남기지 않는다', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    try {
      const token = await kit.sign({ iss: 'https://evil.example.com', aud: KAKAO_APP_KEY, sub: '1' })
      const error: unknown = await verifier.verify('KAKAO', token).catch((caught: unknown) => caught)
      const logged = JSON.stringify([...warnSpy.mock.calls, ...errorSpy.mock.calls])
      expect(logged).not.toContain(token)
      expect(error instanceof UnauthorizedException && JSON.stringify(error.getResponse())).not.toContain(token)
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })
})

describe('createRemoteJwksResolver', () => {
  it('제공자별 원격 JWKS 함수를 만들고 캐시한다(생성만으로는 네트워크 호출 없음)', () => {
    const resolve = createRemoteJwksResolver()
    const kakao = resolve('KAKAO')
    expect(typeof kakao).toBe('function')
    expect(resolve('KAKAO')).toBe(kakao)
  })
})
