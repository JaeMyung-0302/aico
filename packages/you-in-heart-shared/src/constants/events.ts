// EventLog 이벤트 이름(지표 8종). props에는 본문·좌표·URL을 넣지 않는다(schemas/event.ts가 강제)
export const EVENT_NAMES = [
  'app_open',
  'memory_created',
  'memory_viewed',
  'invite_created',
  'couple_paired',
  'kakao_import_completed',
  'notification_sent',
  'widget_added',
] as const
export type EventName = (typeof EVENT_NAMES)[number]
