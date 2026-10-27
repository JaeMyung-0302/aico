import { ApiError } from '@/shared/api/api-error'

// 서버 join 실패는 모두 404 "코드를 확인해 주세요"(만료·없음·이미 사용 구분 안 함), 429 = 사용자당 5회/10분
export const toJoinErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) return '연결하지 못했어요. 잠시 후 다시 시도해 주세요'
  if (error.kind === 'NOT_FOUND') return '코드를 확인해 주세요'
  if (error.kind === 'RATE_LIMITED') return '여러 번 틀려서 잠시 입력할 수 없어요. 10분 뒤에 다시 시도해 주세요'
  if (error.code === 'NETWORK') return '인터넷 연결을 확인해 주세요'
  return '연결하지 못했어요. 잠시 후 다시 시도해 주세요'
}

// 입력은 대문자로, 코드 문자(영문·숫자)만 남긴다. 서버·shared 스키마도 같은 정규화를 한다
export const normalizeInviteCodeInput = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
