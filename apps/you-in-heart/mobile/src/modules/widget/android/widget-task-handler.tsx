import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import DdayWidget, { EMPTY_SNAPSHOT_TEXT, SNAPSHOT_KEY, WIDGET_NAME } from './DdayWidget'

// 위젯 추가·주기 갱신·크기 변경 때 headless로 불린다. 앱이 꺼져 있어도 스냅샷만 읽어 그린다
export const widgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) => {
  if (widgetInfo.widgetName !== WIDGET_NAME || widgetAction === 'WIDGET_DELETED') return
  try {
    const snapshot = await AsyncStorage.getItem(SNAPSHOT_KEY)
    renderWidget(<DdayWidget text={snapshot ?? EMPTY_SNAPSHOT_TEXT} />)
  } catch {
    renderWidget(<DdayWidget text={EMPTY_SNAPSHOT_TEXT} />)
  }
}
