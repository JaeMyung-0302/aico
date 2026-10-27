import AsyncStorage from '@react-native-async-storage/async-storage'
import { requestApi } from '@/shared/api/api-client'
import { flushWidgetEvents, queueWidgetAdded, WIDGET_EVENT_QUEUE_KEY } from '../data-access-widget/widget-events'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
})

describe('widget-events (widget_added 큐)', () => {
  it('큐에 쌓인 위젯 추가를 POST /events widget_added 로 보내고 큐를 비운다', async () => {
    await queueWidgetAdded('DdayWidget')
    await queueWidgetAdded('DdayWidgetWide')
    await flushWidgetEvents()

    expect(requestApi).toHaveBeenCalledTimes(2)
    expect(requestApi).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      url: '/events',
      data: { name: 'widget_added', props: { widget: 'DdayWidget', platform: 'android' } },
    })
    await expect(AsyncStorage.getItem(WIDGET_EVENT_QUEUE_KEY)).resolves.toBeNull()
  })

  it('큐가 비어 있으면 아무것도 보내지 않는다', async () => {
    await flushWidgetEvents()
    expect(requestApi).not.toHaveBeenCalled()
  })

  it('전송에 실패하면 남은 이벤트를 큐에 그대로 둔다(다음 실행 때 다시)', async () => {
    jest.mocked(requestApi).mockRejectedValueOnce(new Error('offline'))
    await queueWidgetAdded('DdayWidget')
    await expect(flushWidgetEvents()).rejects.toThrow('offline')
    await expect(AsyncStorage.getItem(WIDGET_EVENT_QUEUE_KEY)).resolves.toBe(JSON.stringify([{ widget: 'DdayWidget' }]))
  })

  it('깨진 큐 값은 버린다', async () => {
    await AsyncStorage.setItem(WIDGET_EVENT_QUEUE_KEY, '{broken')
    await flushWidgetEvents()
    expect(requestApi).not.toHaveBeenCalled()
    await expect(AsyncStorage.getItem(WIDGET_EVENT_QUEUE_KEY)).resolves.toBeNull()
  })
})
