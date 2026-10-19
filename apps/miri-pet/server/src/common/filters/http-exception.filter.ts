import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { captureServerError } from '../../observability/sentry'
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware'

type ErrorBody = { status: number; body: Record<string, unknown> }

// express 미들웨어(body-parser 등) 에러가 실은 4xx 상태. 아니면 null
const clientErrorStatusOf = (exception: unknown): number | null => {
  if (!(exception instanceof Error)) return null
  const status: unknown = Reflect.get(exception, 'status') ?? Reflect.get(exception, 'statusCode')
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null
}

// QA1 P3: 원문 에러 메시지는 숨기고 앱 에러 모양(code·한국어 message)으로 바꾼다
const clientErrorBody = (status: number): ErrorBody =>
  status === HttpStatus.PAYLOAD_TOO_LARGE
    ? { status, body: { statusCode: status, code: 'PAYLOAD_TOO_LARGE', message: '요청 내용이 너무 커요' } }
    : { status, body: { statusCode: status, message: '요청 형식이 올바르지 않아요' } }

const RATE_LIMITED_BODY: ErrorBody = {
  status: HttpStatus.TOO_MANY_REQUESTS,
  body: {
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    code: 'RATE_LIMITED',
    message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요',
  },
}

const toBody = (exception: unknown): ErrorBody => {
  if (exception instanceof ThrottlerException) return RATE_LIMITED_BODY
  if (!(exception instanceof HttpException)) {
    const clientStatus = clientErrorStatusOf(exception)
    if (clientStatus !== null) return clientErrorBody(clientStatus)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' },
    }
  }
  const status = exception.getStatus()
  const response = exception.getResponse()
  const body =
    typeof response === 'string' ? { statusCode: status, message: response } : { statusCode: status, ...response }
  return { status, body }
}

// 모든 에러 응답에 requestId를 붙여 로그와 클라이언트 신고를 이어준다
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()
    const requestId = String(req.headers[REQUEST_ID_HEADER] ?? '')
    const { status, body } = toBody(exception)
    if (status >= 500) {
      captureServerError(exception, requestId)
      this.logger.error(
        `[${requestId}] ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }
    res.status(status).json({ ...body, requestId })
  }
}
