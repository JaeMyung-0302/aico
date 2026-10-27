import AsyncStorage from '@react-native-async-storage/async-storage'
import { WidgetSnapshotV1 } from '@you-in-heart/shared'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { queueWidgetAdded } from '../data-access-widget/widget-events'
import { renderDdayWidget, SNAPSHOT_KEY, WIDGET_NAMES } from './DdayWidget'

const isDdayWidget = (name: string): boolean => WIDGET_NAMES.some((widgetName) => widgetName === name)

// 계약(strict)에 맞지 않으면(깨진 값·예전 버전·금지 키) 버리고 미로그인 상태로 그린다
const readSnapshot = async (): Promise<WidgetSnapshotV1 | null> => {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY)
    if (raw === null) return null
    const parsed = WidgetSnapshotV1.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// 위젯 추가·주기 갱신(30분)·크기 변경 때 headless 로 불린다. 앱이 꺼져 있어도 스냅샷만 읽어 그린다
export const widgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) => {
  if (!isDdayWidget(widgetInfo.widgetName) || widgetAction === 'WIDGET_DELETED') return
  // headless 에는 로그인 토큰을 쓰지 않는다 → 이벤트는 큐에 넣고 다음 앱 실행 때 보낸다(useWidgetSync)
  if (widgetAction === 'WIDGET_ADDED') await queueWidgetAdded(widgetInfo.widgetName).catch(() => undefined)
  renderWidget(renderDdayWidget(await readSnapshot(), widgetInfo, Date.now()))
}
