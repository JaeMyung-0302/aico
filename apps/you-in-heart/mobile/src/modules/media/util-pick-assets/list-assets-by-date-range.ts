import { MAX_PHOTOS_PER_ENTRY, toKstDate } from '@you-in-heart/shared'
import * as MediaLibrary from 'expo-media-library/legacy'

const PAGE_SIZE = 500

export type DateRange = { fromMs: number; toMs: number }
export type DatedAsset = { id: string; creationTime: number }
export type AssetDateGroup = { date: string; assetIds: string[] }

const rangeQuery = ({ fromMs, toMs }: DateRange) => ({
  mediaType: MediaLibrary.MediaType.photo,
  createdAfter: fromMs,
  createdBefore: toMs,
})

// SCR-08 기간 옵션 옆 장수: 1장만 받아 totalCount 로 센다
export const countAssetsInRange = async (range: DateRange): Promise<number> => {
  const page = await MediaLibrary.getAssetsAsync({ ...rangeQuery(range), first: 1 })
  return page.totalCount
}

// 기간 안의 사진을 끝까지 모은다(id·촬영 시각만 — 경로·위치는 올릴 때 다시 읽는다)
export const listAssetsByDateRange = async (range: DateRange): Promise<DatedAsset[]> => {
  const collect = async (after: string | undefined, acc: DatedAsset[]): Promise<DatedAsset[]> => {
    const page = await MediaLibrary.getAssetsAsync({
      ...rangeQuery(range),
      first: PAGE_SIZE,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    })
    const next = [...acc, ...page.assets.map(({ id, creationTime }) => ({ id, creationTime }))]
    return page.hasNextPage && page.endCursor ? collect(page.endCursor, next) : next
  }
  return collect(undefined, [])
}

// KST 날짜별로 묶는다(날짜·촬영 순). 촬영 시각이 없는 사진과 하루 20장(엔트리 상한)을 넘는 사진은 건너뛰고 센다
export const groupAssetsByKstDate = (
  assets: readonly DatedAsset[],
  maxPerDate = MAX_PHOTOS_PER_ENTRY,
): { groups: AssetDateGroup[]; skipped: number } => {
  // 새 배열을 만들어 정렬한다(입력은 건드리지 않는다)
  const dated = assets
    .filter((asset) => asset.creationTime > 0)
    .sort((left, right) => left.creationTime - right.creationTime)
  // 수만 장을 날짜마다 복사하지 않도록 함수 안의 Map 에만 모은다(밖으로는 새 groups 만 나간다)
  const byDate = new Map<string, string[]>()
  dated.forEach((asset) => {
    const date = toKstDate(asset.creationTime)
    const ids = byDate.get(date)
    if (ids) ids.push(asset.id)
    else byDate.set(date, [asset.id])
  })
  // 촬영 순으로 넣었으므로 Map 순서가 곧 날짜 오름차순이다
  const groups = [...byDate.entries()].map(([date, assetIds]) => ({ date, assetIds: assetIds.slice(0, maxPerDate) }))
  const kept = groups.reduce((sum, group) => sum + group.assetIds.length, 0)
  return { groups, skipped: assets.length - kept }
}
