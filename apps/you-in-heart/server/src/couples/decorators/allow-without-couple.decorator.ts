import { SetMetadata } from '@nestjs/common'

export const ALLOW_WITHOUT_COUPLE_KEY = 'yih:allow-without-couple'

// CoupleGuard(전역)를 건너뛴다: 공개 라우트(health·auth)와 커플 연결 전에도 쓰는 라우트(/me·invite·join·events).
// 인증이 필요하면 @Authenticated()를 함께 붙인다. 새로 붙이면 tenant-matrix의 withoutCoupleRoutes에도 이유와 함께 적는다
export const AllowWithoutCouple = () => SetMetadata(ALLOW_WITHOUT_COUPLE_KEY, true)
