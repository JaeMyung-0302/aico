import { type CreatePlaceReportRequest, createPlaceReportRequestSchema } from '@miri-pet/shared'
import type { Prisma } from '../generated/prisma'

// 저장된 payload는 제출 시 검증을 통과한 값이지만, Json 컬럼이라 읽을 때 다시 검증한다
export const parseReportPayload = (payload: Prisma.JsonValue): CreatePlaceReportRequest => {
  const result = createPlaceReportRequestSchema.safeParse(payload)
  if (!result.success) throw new Error('제보 payload 형식이 올바르지 않습니다')
  return result.data
}

// 신규 제보면 제보한 이름, 수정 제보면 바꾸려는 이름(없으면 null)
export const payloadName = (payload: CreatePlaceReportRequest): string | null =>
  payload.kind === 'CLOSED' ? null : (payload.name ?? null)
