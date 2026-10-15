export type ApiErrorCode = 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE'

export type ApiIssue = { path: string; message: string }

type ApiErrorInit = {
  code: ApiErrorCode
  message: string
  status?: number | null
  issues?: ApiIssue[]
  requestId?: string
}

// 화면은 axios 에러 대신 이 타입만 다룬다
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly issues: ApiIssue[]
  readonly requestId: string | null

  constructor({ code, message, status = null, issues = [], requestId }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.issues = issues
    this.requestId = requestId ?? null
  }
}
