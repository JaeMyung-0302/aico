import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BUCKET_QUERY_KEY } from '@/modules/bucket/data-access-bucket/useBucket'
import { PLACES_QUERY_KEY } from '@/modules/map/data-access-place/usePlaces'
import { uploadQueue } from '@/modules/media/data-access-media/upload-queue-store'
import { DIARY_QUERY_KEY, PHOTOS_QUERY_KEY } from '@/shared/auth/query-keys'
import { deleteDiary } from './diary-api'
import { diaryEntryQueryKey } from './useDiaryEntry'

const isSameKey = (left: readonly unknown[], right: readonly unknown[]): boolean =>
  left.length === right.length && left.every((part, index) => part === right[index])

// 지운 기록의 남은 업로드는 버리고(서버 404) 타임라인·앨범·지도 장소·버킷(완료 기록 연결)을 다시 받는다.
// 닫히는 중인 상세 화면이 404 를 다시 받지 않도록 그 기록의 캐시는 건드리지 않는다(화면이 사라지면 정리된다)
export const useDeleteDiary = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDiary(id),
    onSuccess: (_result, id) => {
      uploadQueue.getState().removeEntry(id)
      const entryKey = diaryEntryQueryKey(id)
      queryClient
        .invalidateQueries({ queryKey: DIARY_QUERY_KEY, predicate: ({ queryKey }) => !isSameKey(queryKey, entryKey) })
        .catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: PHOTOS_QUERY_KEY }).catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: PLACES_QUERY_KEY }).catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: BUCKET_QUERY_KEY }).catch(() => undefined)
    },
  })
}
