import {
  computeDday,
  cursorPage,
  customAnniversarySchema,
  EVENT_NAMES,
  exportManifestV1Schema,
  MAX_PHOTOS_PER_ENTRY,
  parseKakaoExport,
  updateBucketItemRequestSchema,
  WidgetSnapshotV1,
} from '../index'

const ID = '0192f1a4-7c3e-7a1b-9c2d-1e2f3a4b5c6d'

describe('index barrel', () => {
  it('날짜·스키마·상수를 한 곳에서 내보낸다', () => {
    expect(computeDday('2024-03-01', '2024-03-01T00:00:00Z').label).toBe('D+1')
    expect(WidgetSnapshotV1.safeParse({ v: 1, startedOn: '2024-03-01', names: ['a', 'b'], next: null }).success).toBe(
      true,
    )
    expect(EVENT_NAMES).toHaveLength(8)
    expect(MAX_PHOTOS_PER_ENTRY).toBe(20)
    expect(parseKakaoExport('')).toEqual({ messages: [], unparsed: [] })
  })
})

describe('cursorPage', () => {
  it('items와 nextCursor(nullable)를 검사한다', () => {
    const page = cursorPage(customAnniversarySchema)
    expect(
      page.safeParse({ items: [{ id: ID, title: '첫 여행', date: '2023-05-05' }], nextCursor: null }).success,
    ).toBe(true)
    expect(page.safeParse({ items: [], nextCursor: 'not-uuid' }).success).toBe(false)
  })
})

describe('updateBucketItemRequestSchema', () => {
  it('빈 변경은 거부, 완료·완료 취소는 허용', () => {
    expect(updateBucketItemRequestSchema.safeParse({}).success).toBe(false)
    expect(updateBucketItemRequestSchema.safeParse({ done: true, entryId: ID }).success).toBe(true)
    expect(updateBucketItemRequestSchema.safeParse({ done: false, entryId: null }).success).toBe(true)
  })
})

describe('exportManifestV1Schema', () => {
  const manifest = {
    v: 1,
    exportedAt: '2026-10-27T00:00:00Z',
    couple: { startedOn: '2024-03-01', names: ['나', '너'] },
    diary: [
      {
        id: ID,
        kind: 'AUTO_DAY',
        happenedOn: '2024-03-01',
        title: null,
        body: '',
        placeId: null,
        photos: [{ id: ID, path: `photos/2024-03-01/${ID}.heic`, takenAt: null }],
      },
    ],
    anniversaries: [
      { id: 'auto:100d:100', refKey: 'auto:100d:100', kind: 'HUNDRED_DAYS', title: '100일', date: '2024-06-08' },
    ],
    places: [],
    bucket: [],
    quotes: [
      {
        id: ID,
        source: 'TXT',
        text: '사랑해',
        speakerLabel: null,
        saidAt: null,
        memo: null,
        createdAt: '2026-10-27T00:00:00Z',
      },
    ],
  }

  it('v1 매니페스트를 통과시키고 버전이 다르면 거부', () => {
    expect(exportManifestV1Schema.safeParse(manifest).success).toBe(true)
    expect(exportManifestV1Schema.safeParse({ ...manifest, v: 2 }).success).toBe(false)
  })
})
