import {
  type BucketItem,
  bucketItemSchema,
  bucketListResponseSchema,
  type CreateBucketItemRequest,
  type UpdateBucketItemRequest,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// GET /bucket — 커플당 수십 개라 페이지 없이 전부(만든 순)
export const fetchBucketItems = async (): Promise<BucketItem[]> => {
  const { items } = await requestApi({ method: 'GET', url: '/bucket', schema: bucketListResponseSchema })
  return items
}

export const createBucketItem = (body: CreateBucketItemRequest): Promise<BucketItem> =>
  requestApi({ method: 'POST', url: '/bucket', data: body, schema: bucketItemSchema })

// done:true 면 완료(entryId 는 같은 커플 일기만), done:false 면 완료 취소(entryId 도 풀린다)
export const updateBucketItem = (id: string, body: UpdateBucketItemRequest): Promise<BucketItem> =>
  requestApi({ method: 'PATCH', url: `/bucket/${encodeURIComponent(id)}`, data: body, schema: bucketItemSchema })

export const deleteBucketItem = (id: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/bucket/${encodeURIComponent(id)}` })
