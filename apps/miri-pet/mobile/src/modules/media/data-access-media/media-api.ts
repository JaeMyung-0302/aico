import {
  type CreateUploadRequest,
  type CreateUploadResponse,
  createUploadResponseSchema,
  type Media,
  mediaSchema,
} from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { ApiError } from '@/shared/api/api-error'

// D7 업로드 3단계: presign → (스토리지에 직접 PUT) → complete
export const createUpload = (body: CreateUploadRequest): Promise<CreateUploadResponse> =>
  requestApi({ method: 'POST', url: '/media/uploads', data: body, schema: createUploadResponseSchema })

export const completeUpload = (mediaId: string): Promise<Media> =>
  requestApi({ method: 'POST', url: `/media/${mediaId}/complete`, schema: mediaSchema })

const readFileBlob = async (fileUri: string): Promise<Blob> => (await fetch(fileUri)).blob()

// presign의 Content-Length 서명과 맞추려면 실제 업로드할 파일 크기를 먼저 알아야 한다
export const readFileSize = async (fileUri: string): Promise<number> => (await readFileBlob(fileUri)).size

// presigned URL은 API 서버가 아닌 R2로 바로 보낸다(인증 헤더 없음, 서명된 헤더만)
export const putToStorage = async ({
  uploadUrl,
  headers,
  fileUri,
}: {
  uploadUrl: string
  headers: Record<string, string>
  fileUri: string
}): Promise<void> => {
  const response = await fetch(uploadUrl, { method: 'PUT', headers, body: await readFileBlob(fileUri) }).catch(() => {
    throw new ApiError({ code: 'NETWORK', message: '네트워크 연결을 확인해 주세요' })
  })
  if (!response.ok) {
    throw new ApiError({ code: 'HTTP', status: response.status, message: '사진을 올리지 못했어요' })
  }
}
