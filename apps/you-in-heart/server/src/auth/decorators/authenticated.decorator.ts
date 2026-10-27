import { applyDecorators, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'

// 로그인 필수 라우트의 기본값. 0E의 커플 라우트는 이 뒤에 CoupleGuard를 붙인다
export const Authenticated = () => applyDecorators(UseGuards(JwtAuthGuard))
