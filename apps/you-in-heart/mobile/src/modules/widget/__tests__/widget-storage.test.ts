import AsyncStorage from '@react-native-async-storage/async-storage'
import { ExtensionStorage } from '@bacons/apple-targets'
import type { WidgetSnapshotV1 } from '@you-in-heart/shared'
import { requestWidgetUpdate } from 'react-native-android-widget'
import * as androidStorage from '../data-access-widget/widget-storage.android'
import * as iosStorage from '../data-access-widget/widget-storage.ios'

const mockSet = jest.fn()
const mockRemove = jest.fn()

jest.mock('@bacons/apple-targets', () => {
  const MockExtensionStorage = jest.fn().mockImplementation(() => ({ set: mockSet, remove: mockRemove }))
  return { ExtensionStorage: Object.assign(MockExtensionStorage, { reloadWidget: jest.fn() }) }
})
jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn(async () => undefined),
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  SvgWidget: 'SvgWidget',
}))

const SCREEN = { screenHeightDp: 800, screenWidthDp: 400, density: 3, densityDpi: 480, fontScale: 1 }

const SNAPSHOT: WidgetSnapshotV1 = {
  v: 1,
  startedOn: '2025-09-10',
  names: ['재명', '지은'],
  next: { title: '500일', date: '2027-01-22' },
}

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
})

describe('widget-storage.ios (App Group UserDefaults)', () => {
  it('snapshot 키에 JSON 을 쓰고 DdayWidget 타임라인을 다시 받게 한다', async () => {
    await iosStorage.writeWidgetSnapshot(SNAPSHOT)
    expect(ExtensionStorage).toHaveBeenCalledWith('group.com.aico.youinheart')
    expect(mockSet).toHaveBeenCalledWith('snapshot', JSON.stringify(SNAPSHOT))
    expect(ExtensionStorage.reloadWidget).toHaveBeenCalledWith('DdayWidget')
  })

  it('지우면 키를 없애고 위젯을 다시 그린다', async () => {
    await iosStorage.clearWidgetSnapshot()
    expect(mockRemove).toHaveBeenCalledWith('snapshot')
    expect(ExtensionStorage.reloadWidget).toHaveBeenCalledWith('DdayWidget')
  })
})

describe('widget-storage.android (AsyncStorage)', () => {
  it('widget:snapshot 에 JSON 을 쓰고 두 크기 위젯 모두 다시 그린다', async () => {
    await androidStorage.writeWidgetSnapshot(SNAPSHOT)
    await expect(AsyncStorage.getItem('widget:snapshot')).resolves.toBe(JSON.stringify(SNAPSHOT))
    const names = jest.mocked(requestWidgetUpdate).mock.calls.map(([props]) => props.widgetName)
    expect(names).toEqual(['DdayWidget', 'DdayWidgetWide'])
  })

  it('지우면 키를 없애고 위젯을 다시 그린다', async () => {
    await AsyncStorage.setItem('widget:snapshot', JSON.stringify(SNAPSHOT))
    await androidStorage.clearWidgetSnapshot()
    await expect(AsyncStorage.getItem('widget:snapshot')).resolves.toBeNull()
    expect(requestWidgetUpdate).toHaveBeenCalledTimes(2)
  })
})

describe('widget-storage (그 밖의 플랫폼)', () => {
  it('web 등에서는 아무것도 하지 않는다', async () => {
    const fallback = jest.requireActual<typeof import('../data-access-widget/widget-storage')>(
      '../data-access-widget/widget-storage.ts',
    )
    await expect(fallback.writeWidgetSnapshot(SNAPSHOT)).resolves.toBeUndefined()
    await expect(fallback.clearWidgetSnapshot()).resolves.toBeUndefined()
  })
})

describe('widget-storage.android 다시 그리기', () => {
  it('requestWidgetUpdate 의 renderWidget 은 지금 스냅샷으로 위젯 요소를 만든다', async () => {
    await androidStorage.writeWidgetSnapshot(SNAPSHOT)
    const [props] = jest.mocked(requestWidgetUpdate).mock.calls[0] ?? []
    const info = { widgetName: 'DdayWidget', widgetId: 1, width: 180, height: 80, screenInfo: SCREEN }
    expect(props?.renderWidget(info)).toBeTruthy()
  })
})
