import type { INestApplication } from '@nestjs/common'
import type { AuthTokens } from '@miri-pet/shared'
import request from 'supertest'

// ENABLE_DEV_LOGIN=true로 띄운 앱에서 닉네임으로 로그인한다
export const devLogin = async (app: INestApplication, nickname: string): Promise<AuthTokens & { userId: string }> => {
  const login = await request(app.getHttpServer()).post('/api/v1/auth/dev').send({ nickname }).expect(200)
  const tokens: AuthTokens = login.body
  const me = await request(app.getHttpServer())
    .get('/api/v1/me')
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .expect(200)
  return { ...tokens, userId: me.body.id }
}

export const bearer = (token: string): [string, string] => ['Authorization', `Bearer ${token}`]

export const REQUIRED_CONSENTS = [
  { kind: 'TERMS', version: '2026-10-draft' },
  { kind: 'PRIVACY', version: '2026-10-draft' },
  { kind: 'LOCATION', version: '2026-10-draft' },
  { kind: 'CERTIFICATE', version: '2026-10-draft' },
]

// devLogin + 필수 동의 제출(ConsentGuard 통과 + birthYearVerifiedAt 설정)
export const consentedLogin = async (
  app: INestApplication,
  nickname: string,
): Promise<AuthTokens & { userId: string }> => {
  const session = await devLogin(app, nickname)
  await request(app.getHttpServer())
    .post('/api/v1/me/consents')
    .set(...bearer(session.accessToken))
    .send({ isAge14OrOlder: true, consents: REQUIRED_CONSENTS })
    .expect(204)
  return session
}

// 테스트 파일마다 env를 바꾸고 끝나면 되돌린다(--runInBand는 프로세스를 공유)
export const withEnv = (values: Record<string, string | undefined>): (() => void) => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  const apply = (next: Record<string, string | undefined>) =>
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  apply(values)
  return () => apply(previous)
}
