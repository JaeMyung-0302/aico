import { SetMetadata } from '@nestjs/common'

export const REQUIRES_LOCATION_CONSENT_KEY = 'yih:requires-location-consent'

// 좌표를 받거나 돌려주는 커플 라우트(1D 사진 좌표, 2A 장소)에 붙인다. 위치 동의가 없으면 CoupleGuard가 403
// LOCATION_CONSENT_REQUIRED. 커플 라우트에서만 검사한다(@AllowWithoutCouple 라우트에는 효과 없음)
export const RequiresLocationConsent = () => SetMetadata(REQUIRES_LOCATION_CONSENT_KEY, true)
