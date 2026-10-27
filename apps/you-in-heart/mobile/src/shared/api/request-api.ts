import { isAxiosError, type AxiosInstance, type Method } from 'axios'
import { z, type ZodType } from 'zod'
import { ApiError } from './api-error'

export { ApiError } from './api-error'

const errorBodySchema = z
  .object({
    message: z.string().optional(),
    code: z.string().optional(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    requestId: z.string().optional(),
  })
  .partial()

type RequestOptions = {
  method: Method
  url: string
  data?: unknown
  params?: Record<string, unknown>
  // 기본 인증(저장된 토큰) 대신 보낼 헤더 — 로그아웃 정리처럼 토큰을 지운 뒤 보내는 요청용
  headers?: Record<string, string>
}

type RequestApi = {
  <T>(options: RequestOptions & { schema: ZodType<T> }): Promise<T>
  (options: RequestOptions & { schema?: undefined }): Promise<void>
}

const toApiError = (error: unknown): ApiError => {
  if (!isAxiosError(error) || !error.response) {
    return new ApiError({ code: 'NETWORK', message: '인터넷 연결을 확인해 주세요' })
  }
  const parsed = errorBodySchema.safeParse(error.response.data)
  const body = parsed.success ? parsed.data : {}
  return new ApiError({
    code: 'HTTP',
    status: error.response.status,
    message: body.message ?? '요청을 처리하지 못했어요',
    issues: body.issues,
    requestId: body.requestId,
    serverCode: body.code,
  })
}

// 모든 API 호출의 단일 진입점: 응답을 shared zod 스키마로 검증한다
export const createRequestApi = (client: AxiosInstance): RequestApi => {
  const requestApi = async <T>({ schema, ...options }: RequestOptions & { schema?: ZodType<T> }): Promise<T | void> => {
    const response = await client.request<unknown>(options).catch((error: unknown) => {
      throw toApiError(error)
    })
    if (!schema) return undefined
    const result = schema.safeParse(response.data)
    if (!result.success) {
      throw new ApiError({ code: 'INVALID_RESPONSE', status: response.status, message: '응답 형식이 올바르지 않아요' })
    }
    return result.data
  }
  return requestApi as RequestApi
}
