export type ApiErrorCode = 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE'

// 화면이 상태 코드 대신 보는 분류. 409 = 연결 해제 유예 중 쓰기 시도(SCR-18 시트)
export type ApiErrorKind = 'COUPLE_UNLINKING' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNKNOWN'

export type ApiIssue = { path: string; message: string }

type ApiErrorInit = {
  code: ApiErrorCode
  message: string
  status?: number | null
  issues?: ApiIssue[]
  requestId?: string
}

const KIND_BY_STATUS: Readonly<Record<number, ApiErrorKind>> = {
  404: 'NOT_FOUND',
  409: 'COUPLE_UNLINKING',
  429: 'RATE_LIMITED',
}

export const toApiErrorKind = (status: number | null): ApiErrorKind =>
  status === null ? 'UNKNOWN' : (KIND_BY_STATUS[status] ?? 'UNKNOWN')

// 화면은 axios 에러 대신 이 타입만 다룬다
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly issues: ApiIssue[]
  readonly requestId: string | null

  constructor({ code, message, status = null, issues = [], requestId }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.kind = toApiErrorKind(status)
    this.issues = issues
    this.requestId = requestId ?? null
  }
}

export const isApiErrorKind = (error: unknown, kind: ApiErrorKind): boolean =>
  error instanceof ApiError && error.kind === kind
