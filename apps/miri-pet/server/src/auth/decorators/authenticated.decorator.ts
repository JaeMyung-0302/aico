import { applyDecorators, UseGuards } from '@nestjs/common'
import { ConsentGuard } from '../guards/consent.guard'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'

export { ALLOW_WITHOUT_CONSENT_KEY, AllowWithoutConsent } from './allow-without-consent.decorator'

// 로그인 필수 라우트의 기본값: JwtAuthGuard(로그인·상태) → ConsentGuard(필수 동의).
// 이후 Phase 컨트롤러는 @UseGuards(JwtAuthGuard) 대신 이것을 쓴다. 예외는 @AllowWithoutConsent()로 명시
export const Authenticated = () => applyDecorators(UseGuards(JwtAuthGuard, ConsentGuard))
