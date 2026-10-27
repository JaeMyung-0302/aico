import { z } from 'zod'
import { isoDateSchema } from './common'

// 위젯(App Group·AsyncStorage)에 넣는 유일한 데이터. 토큰·사진·위치·본문 금지 → strict로 추가 키 거부
export const WidgetSnapshotV1 = z
  .object({
    v: z.literal(1),
    startedOn: isoDateSchema,
    names: z.tuple([z.string(), z.string()]),
    next: z.object({ title: z.string(), date: isoDateSchema }).strict().nullable(),
  })
  .strict()
export type WidgetSnapshotV1 = z.infer<typeof WidgetSnapshotV1>
