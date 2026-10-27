// 여러 레이어(api-client 인터셉터, 인증 게이트, 화면)가 함께 쓰는 쿼리 키
export const ME_QUERY_KEY = ['me'] as const
export const COUPLE_QUERY_KEY = ['couple'] as const
// 업로드 큐(사진 complete)·일기 저장·삭제가 함께 무효화한다
export const DIARY_QUERY_KEY = ['diary'] as const
export const PHOTOS_QUERY_KEY = ['photos'] as const
// 설정 내보내기 상태 — EXPORT_READY 푸시를 누르면 다시 받는다
export const EXPORT_QUERY_KEY = ['export'] as const
