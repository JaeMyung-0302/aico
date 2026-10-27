import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AuthProvider } from '@you-in-heart/shared'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'

export const KAKAO_ISSUER = 'https://kauth.kakao.com'

// Apple 추가 시 여기에 https://appleid.apple.com/auth/keys (architecture §4.2)
const JWKS_URLS: Record<AuthProvider, string> = {
  KAKAO: `${KAKAO_ISSUER}/.well-known/jwks.json`,
}

// 발급 후 이 시간이 지난 id_token은 exp가 남아 있어도 거부한다(유출 토큰 재사용 창 축소)
const ID_TOKEN_MAX_AGE = '10m'

// 원인(iss·aud·서명·만료)은 응답에 싣지 않는다. 토큰 원문은 로그에도 남기지 않는다
const invalidIdToken = () => new UnauthorizedException('유효하지 않은 ID 토큰입니다')

export const JWKS_RESOLVER = Symbol('JWKS_RESOLVER')
export type JwksResolver = (provider: AuthProvider) => JWTVerifyGetKey

export type VerifiedIdentity = { provider: AuthProvider; sub: string }

// 운영: 제공자별 원격 JWKS(jose가 캐시·키 회전 처리). 테스트는 로컬 JWKS를 주입한다
export const createRemoteJwksResolver = (): JwksResolver => {
  const cache = new Map<AuthProvider, JWTVerifyGetKey>()
  return (provider) => {
    const cached = cache.get(provider)
    if (cached) return cached
    const jwks = createRemoteJWKSet(new URL(JWKS_URLS[provider]))
    cache.set(provider, jwks)
    return jwks
  }
}

@Injectable()
export class IdTokenVerifier {
  private readonly logger = new Logger(IdTokenVerifier.name)

  constructor(
    @Inject(JWKS_RESOLVER) private readonly resolveJwks: JwksResolver,
    private readonly config: ConfigService,
  ) {}

  // 서명(RS256)·iss·aud(네이티브 앱 키)·exp·iat(10분)을 검증하고 제공자 고유 사용자 id(sub)를 돌려준다
  async verify(provider: AuthProvider, idToken: string): Promise<VerifiedIdentity> {
    const audience = this.config.get<string>('kakao.nativeAppKey') ?? ''
    if (!audience) {
      // 설정 누락은 서버 로그로만 알리고 클라이언트에는 일반 401 (설정 상태 비노출)
      this.logger.error(`${provider} 로그인 설정 누락: KAKAO_NATIVE_APP_KEY가 비어 있습니다`)
      throw invalidIdToken()
    }
    try {
      const { payload } = await jwtVerify(idToken, this.resolveJwks(provider), {
        issuer: KAKAO_ISSUER,
        audience,
        algorithms: ['RS256'],
        maxTokenAge: ID_TOKEN_MAX_AGE,
      })
      if (!payload.sub) throw new Error('sub 없음')
      return { provider, sub: payload.sub }
    } catch {
      throw invalidIdToken()
    }
  }
}
