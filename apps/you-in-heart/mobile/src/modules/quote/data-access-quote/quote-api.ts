import {
  type BulkCreateQuotesRequest,
  type BulkCreateQuotesResponse,
  bulkCreateQuotesResponseSchema,
  type CreateQuoteRequest,
  type CreateScreenshotUploadRequest,
  type CreateScreenshotUploadResponse,
  createScreenshotUploadResponseSchema,
  type Quote,
  type QuoteListResponse,
  quoteListResponseSchema,
  quoteSchema,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// 문구 본문은 로그에 남기지 않는다. /quotes 요청 본문은 64KB 를 넘으면 413

// GET /quotes — 최신순. 업로드가 끝나지 않은 스크린샷은 서버가 뺀다
export const fetchQuotePage = ({ cursor, limit }: { cursor?: string; limit?: number }): Promise<QuoteListResponse> =>
  requestApi({
    method: 'GET',
    url: '/quotes',
    params: { ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) },
    schema: quoteListResponseSchema,
  })

// 공유 받은 문구 1건 (SCR-14)
export const createQuote = (body: CreateQuoteRequest): Promise<Quote> =>
  requestApi({ method: 'POST', url: '/quotes', data: body, schema: quoteSchema })

// txt 가져오기: 고른 메시지만(원문 txt 는 보내지 않는다). 호출 쪽이 200건·64KB 로 나눈다
export const bulkCreateQuotes = (items: BulkCreateQuotesRequest['items']): Promise<BulkCreateQuotesResponse> =>
  requestApi({ method: 'POST', url: '/quotes/bulk', data: { items }, schema: bulkCreateQuotesResponseSchema })

// 스크린샷: 발급 → PUT(서명 헤더 그대로) → complete
export const createScreenshotUpload = (body: CreateScreenshotUploadRequest): Promise<CreateScreenshotUploadResponse> =>
  requestApi({ method: 'POST', url: '/quotes/screenshots/uploads', data: body, schema: createScreenshotUploadResponseSchema })

// 멱등. 409 UPLOAD_INCOMPLETE(다시)·422 INVALID_UPLOAD(다른 사진)·503 BUSY(잠시 뒤)
export const completeScreenshot = (quoteId: string): Promise<Quote> =>
  requestApi({ method: 'POST', url: `/quotes/${encodeURIComponent(quoteId)}/screenshot/complete`, schema: quoteSchema })

export const deleteQuote = (quoteId: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/quotes/${encodeURIComponent(quoteId)}` })
