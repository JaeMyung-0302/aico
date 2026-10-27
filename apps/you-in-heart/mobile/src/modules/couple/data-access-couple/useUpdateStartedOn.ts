import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateStartedOn } from './couple-api'
import { syncCoupleCache } from './sync-couple-cache'

export const useUpdateStartedOn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (startedOn: string) => updateStartedOn(startedOn),
    onSuccess: (couple) => syncCoupleCache(queryClient, couple),
  })
}
