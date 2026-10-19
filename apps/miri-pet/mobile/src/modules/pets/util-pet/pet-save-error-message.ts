import { ApiError } from '@/shared/api/api-error'

// 서버 안내를 그대로 보여주는 경우: 5마리 제한(422), 이미 다른 프로필에 쓰인 사진(409 AVATAR_IN_USE)
const SERVER_MESSAGE_STATUSES: readonly number[] = [409, 422]

export const petSaveErrorMessage = (error: unknown): string =>
  error instanceof ApiError && error.status !== null && SERVER_MESSAGE_STATUSES.includes(error.status)
    ? error.message
    : '저장하지 못했어요. 잠시 후 다시 시도해 주세요'
