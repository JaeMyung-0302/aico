import { SetMetadata } from '@nestjs/common'

export const ALLOW_WITHOUT_CONSENT_KEY = 'auth:allowWithoutConsent'

// 동의 전에도 열어 둘 라우트(GET/PATCH /me, POST /me/consents, DELETE /me)에만 붙인다
export const AllowWithoutConsent = () => SetMetadata(ALLOW_WITHOUT_CONSENT_KEY, true)
