// 기획·아키텍처 문서에서 확정된 값. 서버 검증과 앱 UI가 같은 숫자를 쓴다

export const MAX_PHOTOS_PER_ENTRY = 20

// 혼동 문자(I, O, 0, 1) 제외 32자
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const INVITE_CODE_LENGTH = 6
export const INVITE_TTL_HOURS = 24

export const UNLINK_GRACE_DAYS = 30

// 사진 긴 변(px): 표시용 d.jpg, 썸네일 t.jpg
export const DISPLAY_LONG_EDGE = 2048
export const THUMB_LONG_EDGE = 400

export const MAX_QUOTES_PER_BULK = 200
