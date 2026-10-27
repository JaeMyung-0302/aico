import {
  anniversaryRangeQuerySchema,
  createCustomAnniversaryRequestSchema,
  customAnniversaryListResponseSchema,
} from '../anniversary'
import { authProviderParamSchema } from '../auth'
import { bucketItemTitleSchema } from '../bucket'
import { joinCoupleRequestSchema } from '../couple'
import { createDiaryRequestSchema } from '../diary'
import { createPhotoUploadRequestSchema } from '../photo'
import { placeBboxQuerySchema } from '../place'
import { bulkCreateQuotesRequestSchema, createQuoteRequestSchema } from '../quote'
import { putConsentsRequestSchema, updateMeRequestSchema } from '../user'

const ENTRY_ID = '0192f1a4-7c3e-7a1b-9c2d-1e2f3a4b5c6d'

describe('auth', () => {
  it('provider 경로는 kakao만 허용(apple은 400)', () => {
    expect(authProviderParamSchema.safeParse('kakao').success).toBe(true)
    expect(authProviderParamSchema.safeParse('apple').success).toBe(false)
  })
})

describe('user', () => {
  it('displayName은 공백 제거 후 1~20자', () => {
    expect(updateMeRequestSchema.parse({ displayName: '  재명 ' }).displayName).toBe('재명')
    expect(updateMeRequestSchema.safeParse({ displayName: '   ' }).success).toBe(false)
    expect(updateMeRequestSchema.safeParse({ displayName: 'a'.repeat(21) }).success).toBe(false)
  })

  it('TERMS·PRIVACY는 필수 동의, LOCATION은 선택', () => {
    expect(putConsentsRequestSchema.safeParse({ terms: true, privacy: true, location: false }).success).toBe(true)
    expect(putConsentsRequestSchema.safeParse({ terms: false, privacy: true, location: true }).success).toBe(false)
    expect(putConsentsRequestSchema.safeParse({ terms: true, privacy: false, location: true }).success).toBe(false)
  })
})

describe('couple', () => {
  it('초대 코드는 대문자로 정규화하고 혼동 문자를 거부', () => {
    expect(joinCoupleRequestSchema.parse({ code: ' ab3k9z ' }).code).toBe('AB3K9Z')
    expect(joinCoupleRequestSchema.safeParse({ code: 'AB3K9O' }).success).toBe(false)
    expect(joinCoupleRequestSchema.safeParse({ code: 'AB3K9' }).success).toBe(false)
  })
})

describe('anniversary', () => {
  it('제목 1~30자, 날짜 필수', () => {
    expect(createCustomAnniversaryRequestSchema.safeParse({ title: '첫 여행', date: '2023-05-05' }).success).toBe(true)
    expect(createCustomAnniversaryRequestSchema.safeParse({ title: '', date: '2023-05-05' }).success).toBe(false)
    expect(createCustomAnniversaryRequestSchema.safeParse({ title: 'a'.repeat(31), date: '2023-05-05' }).success).toBe(
      false,
    )
    expect(createCustomAnniversaryRequestSchema.safeParse({ title: '여행' }).success).toBe(false)
  })

  it('from > to는 거부', () => {
    expect(anniversaryRangeQuerySchema.safeParse({ from: '2024-01-01', to: '2024-12-31' }).success).toBe(true)
    expect(anniversaryRangeQuerySchema.safeParse({ from: '2024-12-31', to: '2024-01-01' }).success).toBe(false)
  })

  it('커스텀 목록 응답은 원래 날짜(YYYY-MM-DD)를 담는다', () => {
    const item = { id: ENTRY_ID, title: '첫 여행', date: '2023-05-05' }
    expect(customAnniversaryListResponseSchema.safeParse({ items: [item] }).success).toBe(true)
    expect(customAnniversaryListResponseSchema.safeParse({ items: [{ ...item, date: '2023-5-5' }] }).success).toBe(
      false,
    )
  })
})

describe('diary', () => {
  it('본문 0~5,000자', () => {
    expect(createDiaryRequestSchema.safeParse({ happenedOn: '2024-03-01', body: '' }).success).toBe(true)
    expect(createDiaryRequestSchema.safeParse({ happenedOn: '2024-03-01', body: 'a'.repeat(5001) }).success).toBe(false)
  })
})

describe('photo', () => {
  const base = { entryId: ENTRY_ID, originalMime: 'image/heic', originalBytes: 2_500_000 }

  it('좌표 범위 밖은 거부, 좌표는 둘 다 있거나 둘 다 없어야 한다', () => {
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 37.5, lng: 127 }).success).toBe(true)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 90.1, lng: 127 }).success).toBe(false)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 37.5, lng: -180.1 }).success).toBe(false)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 37.5 }).success).toBe(false)
  })

  it('지원하지 않는 MIME은 거부', () => {
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, originalMime: 'image/gif' }).success).toBe(false)
  })
})

describe('place', () => {
  it('bbox 문자열을 숫자 4개로 파싱', () => {
    expect(placeBboxQuerySchema.parse({ bbox: '126.9,37.4,127.1,37.6' }).bbox).toEqual({
      minLng: 126.9,
      minLat: 37.4,
      maxLng: 127.1,
      maxLat: 37.6,
    })
    expect(placeBboxQuerySchema.safeParse({ bbox: '126.9,37.4,127.1' }).success).toBe(false)
    expect(placeBboxQuerySchema.safeParse({ bbox: '127.1,37.4,126.9,37.6' }).success).toBe(false)
  })
})

describe('bucket', () => {
  it('제목 1~60자', () => {
    expect(bucketItemTitleSchema.safeParse('제주도 가기').success).toBe(true)
    expect(bucketItemTitleSchema.safeParse('a'.repeat(61)).success).toBe(false)
  })
})

describe('quote', () => {
  it('source는 SHARE·TXT만, text 1~2,000자', () => {
    expect(createQuoteRequestSchema.safeParse({ source: 'SHARE', text: '사랑해' }).success).toBe(true)
    expect(createQuoteRequestSchema.safeParse({ source: 'SCREENSHOT', text: '사랑해' }).success).toBe(false)
    expect(createQuoteRequestSchema.safeParse({ source: 'TXT', text: 'a'.repeat(2001) }).success).toBe(false)
  })

  it('bulk는 최대 200건', () => {
    const item = { text: '보고 싶어' }
    expect(bulkCreateQuotesRequestSchema.safeParse({ items: Array.from({ length: 200 }, () => item) }).success).toBe(
      true,
    )
    expect(bulkCreateQuotesRequestSchema.safeParse({ items: Array.from({ length: 201 }, () => item) }).success).toBe(
      false,
    )
    expect(bulkCreateQuotesRequestSchema.safeParse({ items: [] }).success).toBe(false)
  })
})
