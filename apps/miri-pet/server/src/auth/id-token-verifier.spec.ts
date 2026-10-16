import { Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createTestIdTokenKit, type TestIdTokenKit } from '../../test/helpers/id-token-test-keys'
import { createRemoteJwksResolver, GOOGLE_ISSUERS, IdTokenVerifier, KAKAO_ISSUER } from './id-token-verifier'

const KAKAO_APP_KEY = 'kakao-native-app-key'
const GOOGLE_IOS = 'google-ios.apps.googleusercontent.com'
const GOOGLE_WEB = 'google-web.apps.googleusercontent.com'

const makeConfig = (overrides: { kakaoKey?: string; googleIds?: string[] } = {}) =>
  new ConfigService({
    kakao: { nativeAppKey: overrides.kakaoKey ?? KAKAO_APP_KEY },
    google: { clientIds: overrides.googleIds ?? [GOOGLE_WEB, GOOGLE_IOS] },
  })

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

  it('Google: 등록된 client id 중 하나가 aud면 통과한다(두 issuer 표기 모두 허용)', async () => {
    const a = await kit.sign({ iss: GOOGLE_ISSUERS[0], aud: GOOGLE_IOS, sub: 'g-1' })
    const b = await kit.sign({ iss: GOOGLE_ISSUERS[1], aud: GOOGLE_WEB, sub: 'g-2' })
    await expect(verifier.verify('GOOGLE', a)).resolves.toEqual({ provider: 'GOOGLE', sub: 'g-1' })
    await expect(verifier.verify('GOOGLE', b)).resolves.toEqual({ provider: 'GOOGLE', sub: 'g-2' })
  })

  it('iss가 다르면 401', async () => {
    const token = await kit.sign({ iss: 'https://evil.example.com', aud: KAKAO_APP_KEY, sub: '1' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('다른 제공자의 토큰(iss 불일치)은 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: GOOGLE_IOS, sub: '1' })
    await expect(verifier.verify('GOOGLE', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('aud가 다르면 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: 'other-app', sub: '1' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('만료된 토큰은 401', async () => {
    const token = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' }, { expiresIn: '-1m' })
    await expect(verifier.verify('KAKAO', token)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it.each(['KAKAO', 'GOOGLE'] as const)(
    '%s: exp가 남아 있어도 발급(iat) 후 10분이 지난 토큰은 401(재사용 방지)',
    async (provider) => {
      const issuedAt = Math.floor(Date.now() / 1000) - 11 * 60
      const claims =
        provider === 'KAKAO' ? { iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY } : { iss: GOOGLE_ISSUERS[0], aud: GOOGLE_IOS }
      const token = await kit.sign({ ...claims, sub: '1' }, { issuedAt, expiresIn: '1h' })
      await expect(verifier.verify(provider, token)).rejects.toBeInstanceOf(UnauthorizedException)
    },
  )

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

  it('aud 설정이 비어 있으면(키 미설정) 어떤 토큰도 거부한다', async () => {
    const strict = new IdTokenVerifier(() => kit.jwks, makeConfig({ kakaoKey: '', googleIds: [] }))
    const kakao = await kit.sign({ iss: KAKAO_ISSUER, aud: '', sub: '1' })
    const google = await kit.sign({ iss: GOOGLE_ISSUERS[0], aud: GOOGLE_IOS, sub: '1' })
    await expect(strict.verify('KAKAO', kakao)).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(strict.verify('GOOGLE', google)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('미설정 제공자는 일반 401 메시지만 주고(설정 상태 비노출) 서버 로그에 원인을 남긴다', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    try {
      const strict = new IdTokenVerifier(() => kit.jwks, makeConfig({ kakaoKey: '' }))
      const kakao = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' })
      const unconfigured: unknown = await strict.verify('KAKAO', kakao).catch((caught: unknown) => caught)
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
})

describe('createRemoteJwksResolver', () => {
  it('제공자별 원격 JWKS 함수를 만들고 캐시한다(생성만으로는 네트워크 호출 없음)', () => {
    const resolve = createRemoteJwksResolver()
    const kakao = resolve('KAKAO')
    expect(typeof kakao).toBe('function')
    expect(resolve('KAKAO')).toBe(kakao)
    expect(resolve('GOOGLE')).not.toBe(kakao)
  })
})
