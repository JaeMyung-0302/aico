import type { Photo } from '@you-in-heart/shared'
import { toKstDate } from '@you-in-heart/shared'

export type AlbumRow =
  | { type: 'month'; key: string; label: string }
  | { type: 'photos'; key: string; photos: Photo[] }

const UNDATED = '날짜 없음'
const COLUMNS = 3

const monthLabelOf = ({ takenAt }: Photo): string => {
  if (!takenAt) return UNDATED
  const [year, month] = toKstDate(takenAt).split('-')
  return `${year}년 ${Number(month)}월`
}

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

// 촬영 달(KST)마다 머리글 + 3장씩 줄. 목록은 이미 촬영 최신순(시각 없는 사진은 맨 뒤)이다
export const groupPhotosByMonth = (photos: readonly Photo[]): AlbumRow[] => {
  const sections = photos.reduce<{ label: string; photos: Photo[] }[]>((acc, photo) => {
    const label = monthLabelOf(photo)
    const last = acc[acc.length - 1]
    if (last && last.label === label) return [...acc.slice(0, -1), { label, photos: [...last.photos, photo] }]
    return [...acc, { label, photos: [photo] }]
  }, [])
  return sections.flatMap(({ label, photos: inMonth }) => [
    { type: 'month' as const, key: `month:${label}`, label },
    ...chunk(inMonth, COLUMNS).map((row) => ({
      type: 'photos' as const,
      key: `row:${row[0]?.id ?? label}`,
      photos: row,
    })),
  ])
}
