import * as MediaLibrary from 'expo-media-library/legacy'
import {
  countAssetsInRange,
  groupAssetsByKstDate,
  listAssetsByDateRange,
} from '../util-pick-assets/list-assets-by-date-range'

const FROM_MS = Date.parse('2026-10-01T00:00:00+09:00')
const TO_MS = Date.parse('2026-10-27T12:00:00+09:00')

const libraryAsset = (id: string, creationTime: number) => ({
  id,
  filename: `${id}.HEIC`,
  uri: `ph://${id}`,
  mediaType: 'photo' as const,
  mediaSubtypes: [],
  width: 4032,
  height: 3024,
  creationTime,
  modificationTime: creationTime,
  duration: 0,
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('list-assets-by-date-range', () => {
  it('기간 안의 사진을 끝까지(다음 쪽 커서) 모아 id·촬영 시각만 돌려준다', async () => {
    jest
      .mocked(MediaLibrary.getAssetsAsync)
      .mockResolvedValueOnce({
        assets: [libraryAsset('a1', TO_MS - 1000)],
        endCursor: 'c1',
        hasNextPage: true,
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        assets: [libraryAsset('a2', TO_MS - 2000)],
        endCursor: 'c2',
        hasNextPage: false,
        totalCount: 2,
      })

    await expect(listAssetsByDateRange({ fromMs: FROM_MS, toMs: TO_MS })).resolves.toEqual([
      { id: 'a1', creationTime: TO_MS - 1000 },
      { id: 'a2', creationTime: TO_MS - 2000 },
    ])
    expect(MediaLibrary.getAssetsAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ mediaType: 'photo', createdAfter: FROM_MS, createdBefore: TO_MS, after: undefined }),
    )
    expect(MediaLibrary.getAssetsAsync).toHaveBeenNthCalledWith(2, expect.objectContaining({ after: 'c1' }))
  })

  it('장수는 1장만 받아 totalCount 로 센다', async () => {
    jest
      .mocked(MediaLibrary.getAssetsAsync)
      .mockResolvedValueOnce({ assets: [], endCursor: '', hasNextPage: true, totalCount: 2140 })
    await expect(countAssetsInRange({ fromMs: FROM_MS, toMs: TO_MS })).resolves.toBe(2140)
    expect(MediaLibrary.getAssetsAsync).toHaveBeenCalledWith(expect.objectContaining({ first: 1 }))
  })

  it('KST 날짜로 묶는다 (UTC 15:00 = KST 자정 경계), 날짜·촬영 순으로 정렬하고 시각 없는 사진은 뺀다', () => {
    const lateOct24Kst = Date.parse('2026-10-24T14:59:00Z')
    const earlyOct25Kst = Date.parse('2026-10-24T15:01:00Z')
    const { groups, skipped } = groupAssetsByKstDate([
      { id: 'late', creationTime: earlyOct25Kst + 60_000 },
      { id: 'b', creationTime: earlyOct25Kst },
      { id: 'a', creationTime: lateOct24Kst },
      { id: 'unknown', creationTime: 0 },
    ])
    expect(groups).toEqual([
      { date: '2026-10-24', assetIds: ['a'] },
      { date: '2026-10-25', assetIds: ['b', 'late'] },
    ])
    expect(skipped).toBe(1)
  })

  it('하루 20장(엔트리 상한)을 넘는 사진은 건너뛰고 수를 센다', () => {
    const day = Date.parse('2026-10-25T03:00:00Z')
    const assets = Array.from({ length: 23 }, (_, index) => ({ id: `p${index}`, creationTime: day + index }))
    const { groups, skipped } = groupAssetsByKstDate(assets)
    expect(groups[0]?.assetIds).toHaveLength(20)
    expect(groups[0]?.assetIds[19]).toBe('p19')
    expect(skipped).toBe(3)
  })
})
