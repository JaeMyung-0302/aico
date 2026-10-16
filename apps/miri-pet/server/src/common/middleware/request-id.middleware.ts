import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export const REQUEST_ID_HEADER = 'x-request-id'
const MAX_REQUEST_ID_LENGTH = 128

const pickRequestId = (incoming: string | string[] | undefined): string => {
  const value = Array.isArray(incoming) ? incoming[0] : incoming
  const isUsable = typeof value === 'string' && value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH
  return isUsable ? value : randomUUID()
}

// 클라이언트가 보낸 x-request-id를 이어받거나 새로 만들어 응답 헤더에 싣는다
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = pickRequestId(req.headers[REQUEST_ID_HEADER])
  req.headers[REQUEST_ID_HEADER] = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)
  next()
}
