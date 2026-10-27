import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchPhoto, fetchPhotoPage } from '@/modules/media/data-access-media/media-api'
import { PHOTOS_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'

// 첫 쪽은 커서 없음 (함수로 두어 타입이 undefined 로 좁혀지지 않게 한다)
const firstPage = (): string | undefined => undefined

// SCR-08 앨범 그리드: READY 사진만, 촬영 최신순. 업로드가 끝날 때마다 업로드 큐가 이 키를 무효화한다
export const usePhotos = () => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useInfiniteQuery({
    queryKey: [...PHOTOS_QUERY_KEY, 'list'],
    queryFn: ({ pageParam }) => fetchPhotoPage({ cursor: pageParam }),
    initialPageParam: firstPage(),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isSignedIn,
  })
}

// SCR-09 뷰어: 표시용 URL(3600초)은 열 때마다 새로 받는다
export const usePhoto = (photoId: string) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({
    queryKey: [...PHOTOS_QUERY_KEY, 'detail', photoId],
    queryFn: () => fetchPhoto(photoId),
    enabled: isSignedIn,
  })
}
