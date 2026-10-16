import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'
import { captureServerError } from '../../observability/sentry'
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware'

const toBody = (exception: unknown): { status: number; body: Record<string, unknown> } => {
  if (!(exception instanceof HttpException)) {
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
