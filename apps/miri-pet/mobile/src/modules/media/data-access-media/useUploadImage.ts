import { useMutation } from '@tanstack/react-query'
import { completeUpload, createUpload, putToStorage, readFileSize } from './media-api'
import { type PickedImage, prepareImageForUpload } from './prepare-image'

export type UploadPurpose = 'POST' | 'AVATAR' | 'DM' | 'CERTIFICATE' | 'PLACE_REPORT'

// 줄이기 → presign(실제 크기) → R2 PUT → complete(서버 재인코딩) → mediaId
export const uploadImage = async (image: PickedImage, purpose: UploadPurpose): Promise<string> => {
  const prepared = await prepareImageForUpload(image)
  const bytes = await readFileSize(prepared.uri)
  const presigned = await createUpload({ purpose, mime: 'image/jpeg', bytes })
  await putToStorage({ uploadUrl: presigned.uploadUrl, headers: presigned.headers, fileUri: prepared.uri })
  const media = await completeUpload(presigned.mediaId)
  return media.id
}

type UploadVariables = { image: PickedImage; purpose: UploadPurpose }

// 화면은 upload()를 await해 mediaId를 받고, 실패 안내는 errorMessage로 보여준다
export const useUploadImage = () => {
  const mutation = useMutation({ mutationFn: ({ image, purpose }: UploadVariables) => uploadImage(image, purpose) })
  return {
    upload: (image: PickedImage, purpose: UploadPurpose) => mutation.mutateAsync({ image, purpose }),
    isUploading: mutation.isPending,
    isError: mutation.isError,
    errorMessage: mutation.isError ? '사진을 올리지 못했어요. 다시 시도해 주세요' : null,
    reset: mutation.reset,
  }
}
