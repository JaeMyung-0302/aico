import { type UploadItem, uploadProgress } from '@/modules/media/data-access-media/upload-queue-store'

export type UploadSummary = {
  total: number
  done: number
  // 대기·올리는 중
  pending: number
  failed: number
  // "다시 올리기"로 되돌릴 수 있는 실패
  retryable: number
  // 전체 진행률(0~1) — 장마다 단계 진행률을 평균
  progress: number
}

export const summarizeUploads = (items: readonly UploadItem[]): UploadSummary => {
  const count = (predicate: (item: UploadItem) => boolean) => items.filter(predicate).length
  const total = items.length
  return {
    total,
    done: count((item) => item.status === 'done'),
    pending: count((item) => item.status === 'queued' || item.status === 'uploading'),
    failed: count((item) => item.status === 'failed'),
    retryable: count((item) => item.status === 'failed' && item.failure === 'RETRYABLE'),
    progress: total === 0 ? 0 : items.reduce((sum, item) => sum + uploadProgress(item), 0) / total,
  }
}
