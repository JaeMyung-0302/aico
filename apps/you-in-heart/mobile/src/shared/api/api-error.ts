export type ApiErrorCode = 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE'

// 서버 오류 본문 code 로만 구분되는 분류 (사진 업로드·일기 작성자·내보내기)
const SERVER_CODE_KINDS = [
  'CONSENT_REQUIRED',
  'NOT_AUTHOR',
  'PHOTO_LIMIT',
  'TAKEN_AT_IN_FUTURE',
  'ORIGINAL_TOO_LARGE',
  'LOCATION_CONSENT_REQUIRED',
  'UPLOAD_INCOMPLETE',
  'INVALID_UPLOAD',
  'BUSY',
  'PURGE_IMMINENT',
] as const
type ServerCodeKind = (typeof SERVER_CODE_KINDS)[number]

// 화면이 상태 코드 대신 보는 분류. code 없는 409 = 연결 해제 유예 중 쓰기 시도(SCR-18 시트), 403 CONSENT_REQUIRED = 필수 동의 누락
export type ApiErrorKind = 'COUPLE_UNLINKING' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNKNOWN' | ServerCodeKind

export type ApiIssue = { path: string; message: string }

type ApiErrorInit = {
  code: ApiErrorCode
  message: string
  status?: number | null
  issues?: ApiIssue[]
  requestId?: string
  // 서버 오류 본문의 code (403 CONSENT_REQUIRED 등)
  serverCode?: string
}

const KIND_BY_STATUS: Readonly<Record<number, ApiErrorKind>> = {
  404: 'NOT_FOUND',
  409: 'COUPLE_UNLINKING',
  429: 'RATE_LIMITED',
}

const SERVER_CODE_KIND: ReadonlyMap<string, ServerCodeKind> = new Map(SERVER_CODE_KINDS.map((kind) => [kind, kind]))

// 서버 code 가 우선이다 — 409 UPLOAD_INCOMPLETE·PURGE_IMMINENT 는 연결 해제가 아니다
export const toApiErrorKind = (status: number | null, serverCode?: string): ApiErrorKind => {
  const byCode = serverCode ? SERVER_CODE_KIND.get(serverCode) : undefined
  if (status !== null && byCode) return byCode
  return status === null ? 'UNKNOWN' : (KIND_BY_STATUS[status] ?? 'UNKNOWN')
}

// 화면은 axios 에러 대신 이 타입만 다룬다
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly issues: ApiIssue[]
  readonly requestId: string | null

  constructor({ code, message, status = null, issues = [], requestId, serverCode }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.kind = toApiErrorKind(status, serverCode)
    this.issues = issues
    this.requestId = requestId ?? null
  }
}

export const isApiErrorKind = (error: unknown, kind: ApiErrorKind): boolean =>
  error instanceof ApiError && error.kind === kind
