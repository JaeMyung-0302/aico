import type { CreatePlaceReportRequest } from '@miri-pet/shared'
import type { Place } from '../generated/prisma'

type EditReport = Extract<CreatePlaceReportRequest, { kind: 'EDIT' }>
type EditFields = Omit<EditReport, 'kind' | 'placeId' | 'mediaIds'>
type CurrentPlace = Pick<Place, 'name' | 'address' | 'category' | 'allowedSizes' | 'indoorAllowed' | 'conditionsNote'>

const isSameSizes = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((size) => b.includes(size))

// QA1 P3: 현재 장소와 다른 필드가 있거나 제보 메모가 있으면 검수할 내용이 있다
export const hasEditChanges = (edit: EditFields, place: CurrentPlace): boolean => {
  if (edit.note) return true
  if (edit.name !== undefined && edit.name !== place.name) return true
  if (edit.address !== undefined && edit.address !== place.address) return true
  if (edit.category !== undefined && edit.category !== place.category) return true
  if (edit.indoorAllowed !== undefined && edit.indoorAllowed !== place.indoorAllowed) return true
  if (edit.allowedSizes !== undefined && !isSameSizes(edit.allowedSizes, place.allowedSizes)) return true
  return edit.conditionsNote !== undefined && (edit.conditionsNote || null) !== place.conditionsNote
}
