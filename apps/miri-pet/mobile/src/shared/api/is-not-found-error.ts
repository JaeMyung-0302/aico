import { ApiError } from './api-error'

const NOT_FOUND_STATUSES: readonly number[] = [403, 404]

// 대상이 없거나(삭제) 볼 수 없는(차단·비공개) 경우 → "다시 시도"가 소용없으므로 화면이 안내 문구를 구분한다
export const isNotFoundError = (error: unknown): boolean =>
  error instanceof ApiError && error.status !== null && NOT_FOUND_STATUSES.includes(error.status)
