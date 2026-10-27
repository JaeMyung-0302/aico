import type { CreatePlaceRequest, Place } from '@you-in-heart/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDiary } from '@/modules/diary/data-access-diary/diary-api'
import { DIARY_QUERY_KEY } from '@/shared/auth/query-keys'
import { createPlace } from '../data-access-place/place-api'
import { PLACES_QUERY_KEY } from '../data-access-place/usePlaces'

type SavePinsInput = { entryId: string; places: readonly CreatePlaceRequest[] }

// 고른 곳을 차례로 만들고(분당 제한·순서 보장) 기록은 첫 장소에 잇는다 (일기 하나에 장소 하나)
const savePins = async ({ entryId, places }: SavePinsInput): Promise<Place[]> => {
  const created = await places.reduce<Promise<Place[]>>(
    async (previous, body) => [...(await previous), await createPlace(body)],
    Promise.resolve([]),
  )
  const [first] = created
  if (first) await updateDiary(entryId, { placeId: first.id })
  return created
}

export const useSavePins = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: savePins,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PLACES_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEY })
    },
  })
}
