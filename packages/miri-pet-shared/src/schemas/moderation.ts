import { z } from 'zod'
import { idSchema } from './common'
import { userSummarySchema } from './user'
import { REPORT_REASONS } from '../constants/report-reasons'

export const reportTargetTypeSchema = z.enum(['POST', 'COMMENT', 'MESSAGE', 'USER'])
export const reportStatusSchema = z.enum(['PENDING', 'RESOLVED', 'DISMISSED'])
export const reportReasonSchema = z.enum(REPORT_REASONS)
export type ReportReason = z.infer<typeof reportReasonSchema>

export const createReportRequestSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: idSchema,
  reason: reportReasonSchema,
  detail: z.string().trim().max(500).optional(),
})
export type CreateReportRequest = z.infer<typeof createReportRequestSchema>

export const blockRequestSchema = z.object({ userId: idSchema })
export type BlockRequest = z.infer<typeof blockRequestSchema>

// GET /blocks 응답
export const blockListSchema = z.object({ items: z.array(userSummarySchema) })
export type BlockList = z.infer<typeof blockListSchema>
