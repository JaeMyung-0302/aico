import type { WidgetSnapshotV1 } from '@you-in-heart/shared'

// 플랫폼별 구현: widget-storage.ios.ts(App Group UserDefaults), widget-storage.android.ts(AsyncStorage).
// 이 파일은 그 밖의 플랫폼(web)용 no-op 이자 타입 기준이다
export const writeWidgetSnapshot = async (snapshot: WidgetSnapshotV1): Promise<void> => {
  void snapshot
}

export const clearWidgetSnapshot = async (): Promise<void> => undefined
