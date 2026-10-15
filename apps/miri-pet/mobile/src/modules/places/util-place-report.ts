import type { CreatePlaceReportRequest, LatLng, PetSize, Place, PlaceReportKind } from '@miri-pet/shared'

export type PlaceReportDraft = {
  kind: PlaceReportKind
  name: string
  address: string
  category: Place['category']
  allowedSizes: PetSize[]
  indoorAllowed: boolean
  conditionsNote: string
  note: string
}

type BuildContext = { place?: Place; location?: LatLng }
export type BuildResult = { ok: true; request: CreatePlaceReportRequest } | { ok: false; message: string }

const fail = (message: string): BuildResult => ({ ok: false, message })
const optionalText = (value: string): string | undefined => value.trim() || undefined

export const draftFromPlace = (place: Place | undefined, kind: PlaceReportKind): PlaceReportDraft => ({
  kind,
  name: place?.name ?? '',
  address: place?.address ?? '',
  category: place?.category ?? 'CAFE',
  allowedSizes: place?.allowedSizes ?? [],
  indoorAllowed: place?.indoorAllowed ?? false,
  conditionsNote: place?.conditionsNote ?? '',
  note: '',
})

const sameSizes = (a: readonly PetSize[], b: readonly PetSize[]): boolean =>
  a.length === b.length && a.every((size) => b.includes(size))

// 원래 값과 다른 필드만 담는다
const changedFields = (draft: PlaceReportDraft, place: Place) => ({
  ...(draft.name.trim() !== place.name ? { name: draft.name.trim() } : {}),
  ...(draft.address.trim() !== place.address ? { address: draft.address.trim() } : {}),
  ...(draft.category !== place.category ? { category: draft.category } : {}),
  ...(sameSizes(draft.allowedSizes, place.allowedSizes) ? {} : { allowedSizes: draft.allowedSizes }),
  ...(draft.indoorAllowed !== place.indoorAllowed ? { indoorAllowed: draft.indoorAllowed } : {}),
  ...(draft.conditionsNote.trim() !== (place.conditionsNote ?? '')
    ? { conditionsNote: draft.conditionsNote.trim() }
    : {}),
})

const validateRequiredFields = (draft: PlaceReportDraft): string | null => {
  if (!draft.name.trim()) return '장소 이름을 입력해 주세요'
  if (!draft.address.trim()) return '주소를 입력해 주세요'
  if (draft.allowedSizes.length === 0) return '함께 갈 수 있는 크기를 하나 이상 골라주세요'
  return null
}

const buildNew = (draft: PlaceReportDraft, location: LatLng | undefined): BuildResult => {
  const error = validateRequiredFields(draft)
  if (error) return fail(error)
  if (!location) return fail('장소 탭의 지도에서 위치를 정한 뒤 제보해 주세요')
  const conditionsNote = optionalText(draft.conditionsNote)
  const note = optionalText(draft.note)
  return {
    ok: true,
    request: {
      kind: 'NEW',
      name: draft.name.trim(),
      address: draft.address.trim(),
      category: draft.category,
      allowedSizes: draft.allowedSizes,
      indoorAllowed: draft.indoorAllowed,
      lat: location.lat,
      lng: location.lng,
      ...(conditionsNote ? { conditionsNote } : {}),
      ...(note ? { note } : {}),
    },
  }
}

export const buildPlaceReportRequest = (draft: PlaceReportDraft, { place, location }: BuildContext): BuildResult => {
  if (draft.kind === 'NEW') return buildNew(draft, location)
  if (!place) return fail('제보할 장소를 찾을 수 없어요')
  const note = optionalText(draft.note)
  if (draft.kind === 'CLOSED') {
    return { ok: true, request: { kind: 'CLOSED', placeId: place.id, ...(note ? { note } : {}) } }
  }
  const changes = changedFields(draft, place)
  if (Object.keys(changes).length === 0 && !note) return fail('바뀐 내용을 알려주세요')
  if (changes.allowedSizes?.length === 0) return fail('함께 갈 수 있는 크기를 하나 이상 골라주세요')
  return { ok: true, request: { kind: 'EDIT', placeId: place.id, ...changes, ...(note ? { note } : {}) } }
}

// 라우트 쿼리(lat, lng 문자열) → 좌표. 하나라도 숫자가 아니면 없음
export const parseReportLocation = (lat: string | undefined, lng: string | undefined): LatLng | undefined => {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!lat || !lng || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined
  return { lat: latitude, lng: longitude }
}
