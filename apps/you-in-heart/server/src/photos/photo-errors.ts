import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'

// 앱이 상태 코드만으로 구분하기 어려운 경우 code를 붙인다(ApiErrorBody.code)
export const photoNotFound = () => new NotFoundException('사진을 찾을 수 없어요')
export const entryNotFound = () => new NotFoundException('일기를 찾을 수 없어요')
export const notEntryAuthor = () =>
  new ForbiddenException({ code: 'NOT_AUTHOR', message: '작성자의 일기에만 사진을 올릴 수 있어요' })
export const locationConsentRequired = () =>
  new ForbiddenException({ code: 'LOCATION_CONSENT_REQUIRED', message: '위치 정보 이용에 동의해 주세요' })
export const photoLimitReached = (max: number) =>
  new BadRequestException({ code: 'PHOTO_LIMIT', message: `일기 하나에 사진은 ${max}장까지예요` })
export const takenAtInFuture = () =>
  new BadRequestException({ code: 'TAKEN_AT_IN_FUTURE', message: '촬영 시각이 미래예요' })
export const originalTooLarge = () =>
  new BadRequestException({ code: 'ORIGINAL_TOO_LARGE', message: '원본 파일이 너무 커요' })
export const uploadIncomplete = () =>
  new ConflictException({ code: 'UPLOAD_INCOMPLETE', message: '아직 업로드가 끝나지 않았어요' })
export const invalidCursor = () => new BadRequestException('잘못된 커서예요')
export const invalidUpload = (message: string) => new UnprocessableEntityException({ code: 'INVALID_UPLOAD', message })
export const sanitizerBusy = () =>
  new ServiceUnavailableException({ code: 'BUSY', message: '사진 처리가 밀려 있어요. 잠시 후 다시 시도해 주세요' })
