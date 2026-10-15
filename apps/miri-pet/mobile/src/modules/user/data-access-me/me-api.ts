import { meSchema, type Me, type UpdateMeRequest } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

export const fetchMe = (): Promise<Me> => requestApi({ method: 'GET', url: '/me', schema: meSchema })

export const updateMe = (patch: UpdateMeRequest): Promise<Me> =>
  requestApi({ method: 'PATCH', url: '/me', data: patch, schema: meSchema })

export const deleteMe = (): Promise<void> => requestApi({ method: 'DELETE', url: '/me' })
