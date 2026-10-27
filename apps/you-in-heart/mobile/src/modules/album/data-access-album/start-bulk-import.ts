import type { CreateAutoDaysResponse } from '@you-in-heart/shared'
import { createAutoDays } from '@/modules/diary/data-access-diary/diary-api'
import { type UploadQueueStore, uploadQueue } from '@/modules/media/data-access-media/upload-queue-store'
import {
  type DateRange,
  groupAssetsByKstDate,
  listAssetsByDateRange,
} from '@/modules/media/util-pick-assets/list-assets-by-date-range'

// 서버 createAutoDaysRequestSchema 의 한 번 요청 상한
const MAX_DAYS_PER_REQUEST = 366

type StartBulkImportDeps = { store?: UploadQueueStore }

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

// 날짜 묶음을 순서대로 보낸다(동시에 보내지 않는다)
const createDays = (dates: readonly string[]): Promise<CreateAutoDaysResponse['entries']> =>
  chunk(dates, MAX_DAYS_PER_REQUEST).reduce<Promise<CreateAutoDaysResponse['entries']>>(
    async (previous, part) => [...(await previous), ...(await createAutoDays(part)).entries],
    Promise.resolve([]),
  )

// SCR-08 과거 사진 일괄 등록: 기간의 사진을 KST 날짜로 묶어 "그날의 사진" 엔트리를 멱등으로 만들고 업로드 큐에 넣는다.
// 다시 시작해도 같은 엔트리(멱등)·같은 큐 key 라 이미 올린 자산은 건너뛴다. 하루 20장을 넘는 사진은 건너뛴다(skipped)
export const startBulkImport = async (
  range: DateRange,
  { store = uploadQueue }: StartBulkImportDeps = {},
): Promise<{ total: number; skipped: number }> => {
  const { groups, skipped } = groupAssetsByKstDate(await listAssetsByDateRange(range))
  if (groups.length === 0) return { total: 0, skipped }
  const entries = await createDays(groups.map((group) => group.date))
  const entryByDate = new Map(entries.map((entry) => [entry.happenedOn, entry.id]))
  const keys = groups.flatMap((group) => {
    const entryId = entryByDate.get(group.date)
    return entryId ? store.getState().enqueue(entryId, group.assetIds) : []
  })
  store.getState().startBulk(keys)
  return { total: keys.length, skipped }
}
