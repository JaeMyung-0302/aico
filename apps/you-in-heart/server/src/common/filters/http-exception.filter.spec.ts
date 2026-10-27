import { NotFoundException } from '@nestjs/common'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { ThrottlerException } from '@nestjs/throttler'
import { GlobalExceptionFilter } from './http-exception.filter'

const hostFor = () => {
  const json = jest.fn<void, [Record<string, unknown>]>()
  const status = jest.fn<{ json: typeof json }, [number]>(() => ({ json }))
  const req = { headers: { 'x-request-id': 'req-1' }, method: 'POST', url: '/x' }
  const host = new ExecutionContextHost([req, { status }, jest.fn()])
  return { host, status, json }
}

const run = (exception: unknown) => {
  const { host, status, json } = hostFor()
  new GlobalExceptionFilter().catch(exception, host)
  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] ?? {} }
}

// body-parser 등 express 미들웨어가 던지는 에러 모양
const expressError = (props: Record<string, unknown>) => Object.assign(new Error('express error'), props)

describe('GlobalExceptionFilter', () => {
  it('HttpException은 상태·본문을 그대로 쓰고 requestId를 붙인다', () => {
    const { status, body } = run(new NotFoundException('없어요'))
    expect(status).toBe(404)
    expect(body).toMatchObject({ statusCode: 404, message: '없어요', requestId: 'req-1' })
  })

  it('QA1 P3: body-parser entity.too.large는 413 PAYLOAD_TOO_LARGE', () => {
    const { status, body } = run(expressError({ type: 'entity.too.large', status: 413, statusCode: 413 }))
    expect(status).toBe(413)
    expect(body).toMatchObject({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE', requestId: 'req-1' })
    expect(typeof body.message).toBe('string')
  })

  it('QA1 P3: express 에러의 4xx status(잘못된 JSON 등)는 그 상태로 응답한다', () => {
    const { status, body } = run(expressError({ type: 'entity.parse.failed', status: 400, statusCode: 400 }))
    expect(status).toBe(400)
    expect(body).toMatchObject({ statusCode: 400 })
    expect(body.message).not.toBe('express error')
  })

  it('express 에러라도 5xx·status 없음은 500으로 숨긴다', () => {
    expect(run(expressError({ status: 503 })).status).toBe(500)
    expect(run(new Error('boom')).body).toMatchObject({ statusCode: 500, message: 'Internal server error' })
  })

  it('QA1 P3: 429(ThrottlerException)는 RATE_LIMITED 코드와 한국어 메시지', () => {
    const { status, body } = run(new ThrottlerException())
    expect(status).toBe(429)
    expect(body).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요',
      requestId: 'req-1',
    })
  })
})
