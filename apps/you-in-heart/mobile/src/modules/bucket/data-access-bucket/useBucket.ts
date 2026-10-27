import type { UpdateBucketItemRequest } from '@you-in-heart/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessionStatus } from '@/shared/auth/session'
import { createBucketItem, deleteBucketItem, fetchBucketItems, updateBucketItem } from './bucket-api'

// 홈 바로가기(진행률)와 버킷리스트 화면이 같이 쓴다
export const BUCKET_QUERY_KEY = ['bucket'] as const

export const useBucketItems = ({ isEnabled = true }: { isEnabled?: boolean } = {}) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: BUCKET_QUERY_KEY, queryFn: fetchBucketItems, enabled: isSignedIn && isEnabled })
}

// 쓰기 뒤에는 목록을 다시 받는다 — 상대가 그사이 바꾼 항목도 함께 보인다
const useBucketMutation = <TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: BUCKET_QUERY_KEY }) })
}

export const useCreateBucketItem = () => useBucketMutation((title: string) => createBucketItem({ title }))

export const useUpdateBucketItem = () =>
  useBucketMutation(({ id, body }: { id: string; body: UpdateBucketItemRequest }) => updateBucketItem(id, body))

export const useDeleteBucketItem = () => useBucketMutation((id: string) => deleteBucketItem(id))
