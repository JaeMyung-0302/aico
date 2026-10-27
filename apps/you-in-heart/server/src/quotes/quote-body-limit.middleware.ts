import { Injectable, type NestMiddleware, PayloadTooLargeException } from '@nestjs/common'
import { MAX_QUOTE_REQUEST_BYTES } from '@you-in-heart/shared'
import type { NextFunction, Request, Response } from 'express'

// /quotes 요청 본문 64KB 상한(plan 4B.1): 카톡 원문 txt를 통째로 올리는 경로를 막는다.
// 전역 body-parser(100KB)가 먼저 읽으므로 Content-Length를 보고, 없으면(chunked) 파싱된 본문 크기로 판단한다
const bodyBytes = (req: Request): number => {
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > 0) return declared
  const body: unknown = req.body
  return body === undefined ? 0 : Buffer.byteLength(JSON.stringify(body))
}

@Injectable()
export class QuoteBodyLimitMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (bodyBytes(req) > MAX_QUOTE_REQUEST_BYTES) {
      throw new PayloadTooLargeException({ code: 'PAYLOAD_TOO_LARGE', message: '요청 내용이 너무 커요' })
    }
    next()
  }
}
