import {
  type CreatePhotoUploadRequest,
  type CreatePhotoUploadResponse,
  createPhotoUploadResponseSchema,
  cursorPage,
  type CursorPage,
  type Photo,
  photoSchema,
  signedUrlResponseSchema,
  type UploadTarget,
} from '@you-in-heart/shared'
import { File } from 'expo-file-system'
import { requestApi } from '@/shared/api/api-client'

const photoPageSchema = cursorPage(photoSchema)

// POST /photos/uploads — 원본·표시용 PUT URL(각 300초). 좌표는 위치 동의가 켜져 있을 때만 싣는다(호출 쪽 책임)
export const createPhotoUpload = (body: CreatePhotoUploadRequest): Promise<CreatePhotoUploadResponse> =>
  requestApi({ method: 'POST', url: '/photos/uploads', data: body, schema: createPhotoUploadResponseSchema })

// 원본·표시용이 모두 올라간 뒤 부른다(멱등). 409 UPLOAD_INCOMPLETE·422 INVALID_UPLOAD·503 BUSY
export const completePhoto = (photoId: string): Promise<Photo> =>
  requestApi({ method: 'POST', url: `/photos/${encodeURIComponent(photoId)}/complete`, schema: photoSchema })

// 앨범: READY 만, 촬영 시각 최신순(없으면 뒤)
export const fetchPhotoPage = ({ cursor }: { cursor?: string }): Promise<CursorPage<Photo>> =>
  requestApi({ method: 'GET', url: '/photos', params: cursor ? { cursor } : {}, schema: photoPageSchema })

export const fetchPhoto = (photoId: string): Promise<Photo> =>
  requestApi({ method: 'GET', url: `/photos/${encodeURIComponent(photoId)}`, schema: photoSchema })

// 원본(촬영 위치 포함) 5분 URL — 뷰어에서 위치 고지를 확인한 뒤에만 부른다
export const fetchPhotoOriginalUrl = async (photoId: string): Promise<string> => {
  const { url } = await requestApi({
    method: 'GET',
    url: `/photos/${encodeURIComponent(photoId)}/original`,
    schema: signedUrlResponseSchema,
  })
  return url
}

export class UploadPutError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`사진을 올리지 못했어요 (${status})`)
    this.name = 'UploadPutError'
    this.status = status
  }
}

// presigned PUT: 서명된 헤더(Content-Type·Content-Length)를 그대로 보내야 서명이 맞는다. URL 은 로그에 남기지 않는다
export const putFileToTarget = async (fileUri: string, target: UploadTarget): Promise<void> => {
  const result = await new File(fileUri).upload(target.url, { httpMethod: 'PUT', headers: target.headers })
  if (result.status < 200 || result.status >= 300) throw new UploadPutError(result.status)
}
