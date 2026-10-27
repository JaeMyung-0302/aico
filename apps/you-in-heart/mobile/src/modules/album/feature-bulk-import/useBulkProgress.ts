import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { uploadQueue } from '@/modules/media/data-access-media/upload-queue-store'

export type BulkProgress = {
  hasSession: boolean
  total: number
  done: number
  failed: number
  retryable: number
  pending: number
  isPaused: boolean
}

// 진행 중인 일괄 등록 범위(bulk.keys)의 완료·실패·대기 수 — 앱을 다시 열어도 저장소에서 이어진다
export const useBulkProgress = (): BulkProgress =>
  useStore(
    uploadQueue,
    useShallow((state) => {
      const keys = new Set(state.bulk?.keys ?? [])
      const items = state.items.filter((item) => keys.has(item.key))
      const count = (status: string) => items.filter((item) => item.status === status).length
      return {
        hasSession: state.bulk !== null && keys.size > 0,
        total: keys.size,
        done: count('done'),
        failed: count('failed'),
        retryable: items.filter((item) => item.status === 'failed' && item.failure === 'RETRYABLE').length,
        pending: count('queued') + count('uploading'),
        isPaused: state.isPaused,
      }
    }),
  )
