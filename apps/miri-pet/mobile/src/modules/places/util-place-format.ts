import type { PetSize, Place } from '@miri-pet/shared'

const CATEGORY_LABELS: Record<Place['category'], string> = {
  CAFE: '카페',
  RESTAURANT: '음식점',
  PARK: '공원',
  ACCOMMODATION: '숙소',
  HOSPITAL: '동물병원',
  ETC: '기타',
}

const SOURCE_LABELS: Record<Place['source'], string> = {
  PUBLIC_DATA: '공공데이터',
  TOUR_API: '한국관광공사',
  KAKAO: '카카오',
  USER: '사용자 제보',
}

export const SIZE_LABELS: Record<PetSize, string> = { S: '소형견', M: '중형견', L: '대형견' }

export const categoryLabel = (category: Place['category']): string => CATEGORY_LABELS[category]
export const sourceLabel = (source: Place['source']): string => SOURCE_LABELS[source]

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const pad = (value: number): string => String(value).padStart(2, '0')

// 기기 시간대와 무관하게 KST 날짜로 표시한다
const formatKstDate = (iso: string): string => {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())}`
}

export const formatVerifiedLine = ({ verifiedAt, source }: Pick<Place, 'verifiedAt' | 'source'>): string =>
  `${verifiedAt ? `최종 확인 ${formatKstDate(verifiedAt)}` : '최종 확인일 없음'} · 출처: ${sourceLabel(source)}`

const largestSizeLabel = (sizes: readonly PetSize[]): string => {
  if (sizes.includes('L')) return '대형견까지'
  if (sizes.includes('M')) return '중형견까지'
  if (sizes.includes('S')) return '소형견만'
  return '크기 정보 없음'
}

export const sizeRuleLabel = (sizes: readonly PetSize[], indoorAllowed: boolean): string =>
  `${largestSizeLabel(sizes)} · ${indoorAllowed ? '실내 동반' : '실외만'}`

export const sizesLabel = (sizes: readonly PetSize[]): string =>
  (['S', 'M', 'L'] as const)
    .filter((size) => sizes.includes(size))
    .map((size) => SIZE_LABELS[size])
    .join(' · ')

export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)}m` : `${(Math.round(km * 10) / 10).toFixed(1)}km`
