import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetSnapshotV1 } from '@you-in-heart/shared'
import { requestWidgetUpdate } from 'react-native-android-widget'
import { renderDdayWidget, SNAPSHOT_KEY, WIDGET_NAMES } from '../android/DdayWidget'

// 추가된 두 크기 위젯을 지금 값으로 다시 그린다(앱이 켜져 있을 때). 꺼져 있을 때는 task handler 가 스냅샷을 읽는다
const redrawWidgets = async (snapshot: WidgetSnapshotV1 | null): Promise<void> => {
  for (const widgetName of WIDGET_NAMES) {
    await requestWidgetUpdate({ widgetName, renderWidget: (info) => renderDdayWidget(snapshot, info, Date.now()) })
  }
}

export const writeWidgetSnapshot = async (snapshot: WidgetSnapshotV1): Promise<void> => {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
  await redrawWidgets(snapshot)
}

export const clearWidgetSnapshot = async (): Promise<void> => {
  await AsyncStorage.removeItem(SNAPSHOT_KEY)
  await redrawWidgets(null)
}
