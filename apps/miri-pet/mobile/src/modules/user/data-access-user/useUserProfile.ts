import { userProfileSchema, type UserProfile } from '@miri-pet/shared'
import { useQuery } from '@tanstack/react-query'
import { requestApi } from '@/shared/api/api-client'

export const userProfileQueryKey = (userId: string) => ['users', userId] as const

export const fetchUserProfile = (userId: string): Promise<UserProfile> =>
  requestApi({ method: 'GET', url: `/users/${userId}`, schema: userProfileSchema })

export const useUserProfile = (userId: string | undefined) =>
  useQuery({
    queryKey: userProfileQueryKey(userId ?? ''),
    queryFn: () => fetchUserProfile(userId ?? ''),
    enabled: Boolean(userId),
  })
