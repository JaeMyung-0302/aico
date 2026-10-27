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
// /quotes 요청 본문 상한(바이트). 넘으면 413 — 원문 txt를 통째로 올리는 경로를 막는다. bulk는 200건과 이 크기를 함께 지켜 나눠 보낸다
export const MAX_QUOTE_REQUEST_BYTES = 64 * 1024
// 스크린샷 업로드(기기에서 줄인 JPEG/PNG/WebP) 상한. 서버가 통째로 읽어 재인코딩한다
export const MAX_SCREENSHOT_BYTES = 15 * 1024 * 1024
