import AsyncStorage from '@react-native-async-storage/async-storage'
import { render } from '@testing-library/react-native'
import type { WidgetSnapshotV1 } from '@you-in-heart/shared'
import { isValidElement } from 'react'
import type { WidgetInfo, WidgetRepresentation, WidgetTaskHandlerProps } from 'react-native-android-widget'
import { FIXED_NOW_MS, mockClockAt } from '@/test-utils/fixtures'
import { DdayWidgetView, type DdayWidgetViewModel, toDdayWidgetViewModel } from '../android/DdayWidget'
import { widgetTaskHandler } from '../android/widget-task-handler'
import { WIDGET_EVENT_QUEUE_KEY } from '../data-access-widget/widget-events'

jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  SvgWidget: 'SvgWidget',
}))

const SNAPSHOT: WidgetSnapshotV1 = {
  v: 1,
  startedOn: '2025-09-10',
  names: ['재명', '지은'],
  next: { title: '500일', date: '2027-01-22' },
}

const SCREEN = { screenHeightDp: 800, screenWidthDp: 400, density: 3, densityDpi: 480, fontScale: 1 }
const SMALL: WidgetInfo = { widgetName: 'DdayWidget', widgetId: 1, width: 180, height: 80, screenInfo: SCREEN }
const WIDE: WidgetInfo = { widgetName: 'DdayWidgetWide', widgetId: 2, width: 320, height: 160, screenInfo: SCREEN }

const run = async (widgetAction: WidgetTaskHandlerProps['widgetAction'], widgetInfo: WidgetInfo = SMALL) => {
  const renderWidget = jest.fn<void, [WidgetRepresentation]>()
  await widgetTaskHandler({ widgetAction, widgetInfo, renderWidget })
  return renderWidget
}

const renderedModel = (renderWidget: jest.Mock<void, [WidgetRepresentation]>): DdayWidgetViewModel => {
  const element = renderWidget.mock.calls[0]?.[0]
  if (!isValidElement<{ model: DdayWidgetViewModel }>(element)) throw new Error('위젯 요소가 아니다')
  return element.props.model
}

beforeEach(async () => {
  mockClockAt(FIXED_NOW_MS)
  await AsyncStorage.clear()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Android 위젯 task handler', () => {
  it('스냅샷이 없으면 로그인 안내를 그린다', async () => {
    const renderWidget = await run('WIDGET_UPDATE')
    expect(renderedModel(renderWidget)).toEqual({ kind: 'empty', message: '앱에서 로그인하면\nD-day가 보여요' })
  })

  it('스냅샷의 사귄 날로 shared computeDday 를 계산해 그린다(2×1)', async () => {
    await AsyncStorage.setItem('widget:snapshot', JSON.stringify(SNAPSHOT))
    const renderWidget = await run('WIDGET_UPDATE')
    expect(renderedModel(renderWidget)).toEqual({
      kind: 'dday',
      size: 'small',
      names: '재명 · 지은',
      days: 413,
      next: { title: '500일', countdown: 'D-87' },
    })
  })

  it('4×2 크기에서는 넓은 배치를 쓴다', async () => {
    await AsyncStorage.setItem('widget:snapshot', JSON.stringify(SNAPSHOT))
    const renderWidget = await run('WIDGET_RESIZED', WIDE)
    expect(renderedModel(renderWidget)).toMatchObject({ kind: 'dday', size: 'wide' })
  })

  it('계약(WidgetSnapshotV1)에 맞지 않는 스냅샷은 버리고 로그인 안내를 그린다', async () => {
    await AsyncStorage.setItem('widget:snapshot', JSON.stringify({ ...SNAPSHOT, accessToken: 'x' }))
    expect(renderedModel(await run('WIDGET_UPDATE')).kind).toBe('empty')
    await AsyncStorage.setItem('widget:snapshot', '{not json')
    expect(renderedModel(await run('WIDGET_UPDATE')).kind).toBe('empty')
  })

  it('처음 추가되면 widget_added 이벤트를 큐에 넣는다(다음 앱 실행 때 전송)', async () => {
    await run('WIDGET_ADDED')
    await run('WIDGET_ADDED', WIDE)
    await expect(AsyncStorage.getItem(WIDGET_EVENT_QUEUE_KEY)).resolves.toBe(
      JSON.stringify([{ widget: 'DdayWidget' }, { widget: 'DdayWidgetWide' }]),
    )
  })

  it('삭제·다른 위젯 이름은 그리지 않는다', async () => {
    expect(await run('WIDGET_DELETED')).not.toHaveBeenCalled()
    expect(await run('WIDGET_UPDATE', { ...SMALL, widgetName: 'Other' })).not.toHaveBeenCalled()
  })

  it('지난 다음 기념일(오래된 스냅샷)은 숨긴다', () => {
    const model = toDdayWidgetViewModel(
      { ...SNAPSHOT, v: 1, names: ['재명', '지은'], next: { title: '400일', date: '2026-10-14' } },
      SMALL,
      FIXED_NOW_MS,
    )
    expect(model).toMatchObject({ kind: 'dday', next: null })
    expect(DdayWidgetView({ model })).toBeTruthy()
  })
})

describe('DdayWidgetView 배치 (SCR-17 Android)', () => {
  // 위젯 원시 요소는 문자열로 대체했다 → TextWidget 의 text 속성을 모아 본다
  type JsonNode = { props: Record<string, unknown>; children: (JsonNode | string)[] | null }
  const collectTexts = (node: JsonNode | string): string[] => {
    if (typeof node === 'string') return []
    const own = typeof node.props.text === 'string' ? [node.props.text] : []
    return [...own, ...(node.children ?? []).flatMap(collectTexts)]
  }
  const renderTexts = async (model: DdayWidgetViewModel): Promise<string[]> => {
    const view = await render(<DdayWidgetView model={model} />)
    const json = view.toJSON()
    if (json === null || Array.isArray(json)) throw new Error('위젯 루트가 하나가 아니다')
    return collectTexts(json)
  }

  it('미로그인: 하트와 안내 문구', async () => {
    const texts = await renderTexts({ kind: 'empty', message: '앱에서 로그인하면\nD-day가 보여요' })
    expect(texts).toEqual(['앱에서 로그인하면\nD-day가 보여요'])
  })

  it('2×1: 이름과 일수', async () => {
    const model = toDdayWidgetViewModel(SNAPSHOT, SMALL, FIXED_NOW_MS)
    expect(await renderTexts(model)).toEqual(['재명 · 지은', '413', '일'])
  })

  it('4×2: 이름·일수·다음 기념일(포인트 색 D-n)', async () => {
    const model = toDdayWidgetViewModel(SNAPSHOT, WIDE, FIXED_NOW_MS)
    expect(await renderTexts(model)).toEqual(['재명 · 지은', '413', '일', '다음 기념일', '500일 · ', 'D-87'])
  })

  it('4×2: 다음 기념일이 없으면 빈 줄로 자리를 지킨다', async () => {
    const model = toDdayWidgetViewModel({ ...SNAPSHOT, next: null }, WIDE, FIXED_NOW_MS)
    expect(await renderTexts(model)).toEqual(['재명 · 지은', '413', '일', ' '])
  })
})
