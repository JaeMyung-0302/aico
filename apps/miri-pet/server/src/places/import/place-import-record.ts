import { petSizeSchema, placeCategorySchema, placeSourceSchema } from '@miri-pet/shared'
import { z } from 'zod'

// 공공데이터·TourAPI·제보 원본을 정규화한 import 파일 한 행(JSON 배열)
const placeImportRowSchema = z.object({
  source: placeSourceSchema,
  sourceRef: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  category: placeCategorySchema,
  address: z.string().trim().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  allowedSizes: z.array(petSizeSchema),
  indoorAllowed: z.boolean(),
  conditionsNote: z.string().trim().max(300).nullish(),
  verifiedAt: z.iso.date().nullish(),
})

export type PlaceImportRecord = Omit<z.infer<typeof placeImportRowSchema>, 'conditionsNote' | 'verifiedAt'> & {
  conditionsNote: string | null
  verifiedAt: Date | null
}

export type PlaceImportSkipped = { missingCoordinates: number; invalid: number }
export type PlaceImportParseResult = { records: PlaceImportRecord[]; skipped: PlaceImportSkipped }

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

// 좌표가 비었거나 (0,0) 플레이스홀더면 지도에 놓을 수 없다
const hasCoordinates = (row: Record<string, unknown>): boolean =>
  typeof row.lat === 'number' && typeof row.lng === 'number' && !(row.lat === 0 && row.lng === 0)

const toRecord = (row: z.infer<typeof placeImportRowSchema>): PlaceImportRecord => ({
  ...row,
  conditionsNote: row.conditionsNote ?? null,
  verifiedAt: row.verifiedAt ? new Date(`${row.verifiedAt}T00:00:00.000Z`) : null,
})

type RowResult = { kind: 'ok'; record: PlaceImportRecord } | { kind: 'missingCoordinates' } | { kind: 'invalid' }

const classifyRow = (row: unknown): RowResult => {
  if (isObject(row) && !hasCoordinates(row)) return { kind: 'missingCoordinates' }
  const parsed = placeImportRowSchema.safeParse(row)
  return parsed.success ? { kind: 'ok', record: toRecord(parsed.data) } : { kind: 'invalid' }
}

export const parsePlaceImportFile = (data: unknown): PlaceImportParseResult => {
  if (!Array.isArray(data)) throw new Error('import 파일은 JSON 배열이어야 합니다')
  const results = data.map(classifyRow)
  const records = results.flatMap((result) => (result.kind === 'ok' ? [result.record] : []))
  // 같은 키가 또 나오면 마지막 행이 이긴다(Map 생성자 규칙) → 한 파일 안에서도 멱등
  const byKey = new Map(records.map((record) => [`${record.source}:${record.sourceRef}`, record]))
  return {
    records: [...byKey.values()],
    skipped: {
      missingCoordinates: results.filter((result) => result.kind === 'missingCoordinates').length,
      invalid: results.filter((result) => result.kind === 'invalid').length,
    },
  }
}
