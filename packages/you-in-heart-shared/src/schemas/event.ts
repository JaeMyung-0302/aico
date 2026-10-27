import { z } from 'zod'
import { EVENT_NAMES } from '../constants/events'

export const eventNameSchema = z.enum(EVENT_NAMES)

// 좌표·URL·본문은 이벤트 로그에 남기지 않는다(대소문자·앞뒤 공백 무시)
export const FORBIDDEN_EVENT_PROP_KEYS: ReadonlySet<string> = new Set(['lat', 'lng', 'url', 'uri', 'body', 'text'])

const MAX_EVENT_PROP_KEYS = 20

const eventPropKeySchema = z
  .string()
  .min(1)
  .max(40)
  .refine((key) => !FORBIDDEN_EVENT_PROP_KEYS.has(key.trim().toLowerCase()), { message: '금지된 이벤트 속성 키' })

// 값은 짧은 원시값만(중첩 객체로 금지 키를 숨기는 경로 차단)
const eventPropValueSchema = z.union([z.string().max(100), z.number(), z.boolean(), z.null()])

export const eventPropsSchema = z
  .record(eventPropKeySchema, eventPropValueSchema)
  .refine((props) => Object.keys(props).length <= MAX_EVENT_PROP_KEYS, { message: '이벤트 속성이 너무 많습니다' })
export type EventProps = z.infer<typeof eventPropsSchema>

// POST /events
export const trackEventRequestSchema = z.object({
  name: eventNameSchema,
  props: eventPropsSchema.default({}),
})
export type TrackEventRequest = z.infer<typeof trackEventRequestSchema>
