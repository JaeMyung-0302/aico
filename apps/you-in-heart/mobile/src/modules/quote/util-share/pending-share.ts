import { create } from 'zustand'
import type { SharePayload } from './resolve-share-payload'

type PendingShareState = {
  payload: SharePayload | null
  set: (payload: SharePayload) => void
  clear: () => void
}

// 받은 공유를 로그인·연결을 마칠 때까지 메모리에만 기억한다(SCR-14 "잠시 기억해 둘게요").
// expo-share-intent 는 앱이 백그라운드로 가면(카카오 로그인) 비우므로 따로 둔다. 기기 저장소에는 남기지 않는다
export const pendingShare = create<PendingShareState>((set) => ({
  payload: null,
  set: (payload) => set({ payload }),
  clear: () => set({ payload: null }),
}))
