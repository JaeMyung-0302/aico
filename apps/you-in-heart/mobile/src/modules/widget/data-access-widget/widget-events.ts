import AsyncStorage from '@react-native-async-storage/async-storage'
import { z } from 'zod'
import { requestApi } from '@/shared/api/api-client'

// Android 위젯 task handler(headless, 로그인 토큰 없이 돈다)가 쌓고, 다음 앱 실행 때 로그인 상태에서 보낸다
export const WIDGET_EVENT_QUEUE_KEY = 'widget:pending-events'

const queueSchema = z.array(z.object({ widget: z.string().max(40) }))
type QueuedWidgetEvent = z.infer<typeof queueSchema>[number]

const readQueue = async (): Promise<QueuedWidgetEvent[]> => {
  const raw = await AsyncStorage.getItem(WIDGET_EVENT_QUEUE_KEY)
  if (raw === null) return []
  try {
    const parsed = queueSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

const writeQueue = async (queue: readonly QueuedWidgetEvent[]): Promise<void> => {
  if (queue.length === 0) await AsyncStorage.removeItem(WIDGET_EVENT_QUEUE_KEY)
  else await AsyncStorage.setItem(WIDGET_EVENT_QUEUE_KEY, JSON.stringify(queue))
}

export const queueWidgetAdded = async (widget: string): Promise<void> => {
  const queue = await readQueue()
  await writeQueue([...queue, { widget }])
}

// 하나씩 보내고 보낸 만큼만 큐에서 뺀다 → 중간에 실패하면 남은 것은 다음 실행 때 다시
export const flushWidgetEvents = async (): Promise<void> => {
  const queue = await readQueue()
  for (const [index, event] of queue.entries()) {
    try {
      await requestApi({
        method: 'POST',
        url: '/events',
        data: { name: 'widget_added', props: { widget: event.widget, platform: 'android' } },
      })
    } catch (error) {
      await writeQueue(queue.slice(index))
      throw error
    }
  }
  await writeQueue([])
}
