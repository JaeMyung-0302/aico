import { ExtensionStorage } from '@bacons/apple-targets'
import type { WidgetSnapshotV1 } from '@you-in-heart/shared'

// targets/widget/index.swift 가 같은 App Group·키를 읽는다
const APP_GROUP = 'group.com.aico.youinheart'
const SNAPSHOT_KEY = 'snapshot'
const WIDGET_KIND = 'DdayWidget'

// 네이티브 모듈 경계는 쓸 때 연다(모듈 로드 시점에 만들지 않는다)
const openStorage = () => new ExtensionStorage(APP_GROUP)

// 쓰고 나면 WidgetKit 타임라인을 다시 받게 한다(자정 갱신은 위젯이 스스로 한다)
export const writeWidgetSnapshot = async (snapshot: WidgetSnapshotV1): Promise<void> => {
  openStorage().set(SNAPSHOT_KEY, JSON.stringify(snapshot))
  ExtensionStorage.reloadWidget(WIDGET_KIND)
}

export const clearWidgetSnapshot = async (): Promise<void> => {
  openStorage().remove(SNAPSHOT_KEY)
  ExtensionStorage.reloadWidget(WIDGET_KIND)
}
