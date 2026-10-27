import {
  anniversaryRangeQuerySchema,
  createCustomAnniversaryRequestSchema,
  customAnniversaryListResponseSchema,
} from '../anniversary'
import { authProviderParamSchema } from '../auth'
import { bucketItemTitleSchema, bucketListResponseSchema } from '../bucket'
import { joinCoupleRequestSchema } from '../couple'
import { createDiaryRequestSchema, diaryListResponseSchema } from '../diary'
import { MAX_DISPLAY_CANDIDATE_BYTES } from '../../constants/limits'
import { exportManifestV1Schema, latestExportResponseSchema } from '../export'
import {
  createPhotoUploadRequestSchema,
  photoOriginalResponseSchema,
  renewPhotoUploadRequestSchema,
} from '../photo'
import { placeBboxQuerySchema, placeListResponseSchema } from '../place'
import { bulkCreateQuotesRequestSchema, createQuoteRequestSchema, quoteListResponseSchema } from '../quote'
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
  it('탈퇴한 작성자·업로더는 null로 내려간다(DB onDelete SetNull)', () => {
    const photo = {
      id: ENTRY_ID,
      entryId: ENTRY_ID,
      uploaderId: null,
      status: 'READY',
      takenAt: null,
      width: 10,
      height: 10,
      thumbUrl: 'https://r2.example/t.jpg',
      displayUrl: 'https://r2.example/d.jpg',
    }
    const entry = {
      id: ENTRY_ID,
      kind: 'MANUAL',
      authorId: null,
      happenedOn: '2024-03-01',
      title: null,
      body: '',
      placeId: null,
      photos: [photo],
      createdAt: '2024-03-01T00:00:00.000Z',
      updatedAt: '2024-03-01T00:00:00.000Z',
    }
    expect(diaryListResponseSchema.safeParse({ items: [entry], nextCursor: null }).success).toBe(true)
  })

  it('본문 0~5,000자', () => {
    expect(createDiaryRequestSchema.safeParse({ happenedOn: '2024-03-01', body: '' }).success).toBe(true)
    expect(createDiaryRequestSchema.safeParse({ happenedOn: '2024-03-01', body: 'a'.repeat(5001) }).success).toBe(false)
  })
})

describe('photo', () => {
  const base = { entryId: ENTRY_ID, originalMime: 'image/heic', originalBytes: 2_500_000, displayBytes: 800_000 }

  it('표시용 후보 바이트 수(displayBytes)는 필수, 1~MAX_DISPLAY_CANDIDATE_BYTES 정수', () => {
    const { displayBytes: _omitted, ...withoutDisplay } = base
    expect(createPhotoUploadRequestSchema.safeParse(withoutDisplay).success).toBe(false)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, displayBytes: 0 }).success).toBe(false)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, displayBytes: 1.5 }).success).toBe(false)
    expect(
      createPhotoUploadRequestSchema.safeParse({ ...base, displayBytes: MAX_DISPLAY_CANDIDATE_BYTES }).success,
    ).toBe(true)
    expect(
      createPhotoUploadRequestSchema.safeParse({ ...base, displayBytes: MAX_DISPLAY_CANDIDATE_BYTES + 1 }).success,
    ).toBe(false)
  })

  it('renew 요청은 displayBytes만 받는다(같은 범위)', () => {
    expect(renewPhotoUploadRequestSchema.parse({ displayBytes: 1 })).toEqual({ displayBytes: 1 })
    expect(renewPhotoUploadRequestSchema.safeParse({}).success).toBe(false)
    expect(renewPhotoUploadRequestSchema.safeParse({ displayBytes: MAX_DISPLAY_CANDIDATE_BYTES + 1 }).success).toBe(
      false,
    )
  })

  it('좌표 범위 밖은 거부, 좌표는 둘 다 있거나 둘 다 없어야 한다', () => {
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 37.5, lng: 127 }).success).toBe(true)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 90.1, lng: 127 }).success).toBe(false)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 37.5, lng: -180.1 }).success).toBe(false)
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, lat: 37.5 }).success).toBe(false)
  })

  it('지원하지 않는 MIME은 거부', () => {
    expect(createPhotoUploadRequestSchema.safeParse({ ...base, originalMime: 'image/gif' }).success).toBe(false)
  })

  it('원본 URL 응답은 url·expiresIn에 저장된 원본 mime을 더한다', () => {
    const original = { url: 'https://r2.example.com/c/1/p/2/o?X-Amz-Expires=300', expiresIn: 300 }
    expect(photoOriginalResponseSchema.parse({ ...original, mime: 'image/heic' })).toEqual({
      ...original,
      mime: 'image/heic',
    })
    expect(photoOriginalResponseSchema.safeParse(original).success).toBe(false)
    expect(photoOriginalResponseSchema.safeParse({ ...original, mime: 'image/gif' }).success).toBe(false)
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

  it('목록 응답은 items 배열(좌표 범위 검사)', () => {
    const place = {
      id: ENTRY_ID,
      name: '한강',
      lat: 37.5,
      lng: 126.9,
      kakaoPlaceId: null,
      address: null,
      createdAt: '2026-10-27T00:00:00Z',
    }
    expect(placeListResponseSchema.safeParse({ items: [place] }).success).toBe(true)
    expect(placeListResponseSchema.safeParse({ items: [{ ...place, lat: 91 }] }).success).toBe(false)
  })
})

describe('bucket', () => {
  it('제목 1~60자', () => {
    expect(bucketItemTitleSchema.safeParse('제주도 가기').success).toBe(true)
    expect(bucketItemTitleSchema.safeParse('a'.repeat(61)).success).toBe(false)
  })

  it('목록 응답은 items 배열(doneAt·entryId nullable)', () => {
    const item = { id: ENTRY_ID, title: '제주', doneAt: null, entryId: null, createdAt: '2026-10-27T00:00:00Z' }
    expect(bucketListResponseSchema.safeParse({ items: [item] }).success).toBe(true)
    expect(bucketListResponseSchema.safeParse({ items: [{ ...item, entryId: 'x' }] }).success).toBe(false)
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

  it('목록 응답은 커서 페이지, 스크린샷 URL은 nullable', () => {
    const quote = {
      id: ENTRY_ID,
      source: 'TXT',
      text: '보고 싶어',
      speakerLabel: 'A',
      saidAt: '2026-10-18T21:00:00+09:00',
      memo: null,
      screenshotUrl: null,
      screenshotThumbUrl: null,
      createdAt: '2026-10-27T00:00:00Z',
    }
    expect(quoteListResponseSchema.safeParse({ items: [quote], nextCursor: null }).success).toBe(true)
    expect(quoteListResponseSchema.safeParse({ items: [{ ...quote, source: 'PDF' }], nextCursor: null }).success).toBe(
      false,
    )
  })
})

describe('export', () => {
  it('최근 작업 응답은 job 또는 null', () => {
    expect(latestExportResponseSchema.safeParse({ job: null }).success).toBe(true)
    const job = {
      id: ENTRY_ID,
      status: 'READY',
      createdAt: '2026-10-27T00:00:00.000Z',
      downloadUrl: 'https://r2.example/x.zip',
      expiresAt: '2026-10-28T00:00:00.000Z',
    }
    expect(latestExportResponseSchema.safeParse({ job }).success).toBe(true)
    expect(latestExportResponseSchema.safeParse({}).success).toBe(false)
  })

  it('manifest의 장소 좌표는 생략할 수 있다(요청자에게 위치 동의가 없을 때), 있으면 범위 검사', () => {
    const manifest = {
      v: 1,
      exportedAt: '2026-10-27T00:00:00.000Z',
      couple: { startedOn: null, names: [] },
      diary: [],
      anniversaries: [],
      bucket: [],
      quotes: [],
    }
    const createdAt = '2026-10-27T00:00:00.000Z'
    const place = { id: ENTRY_ID, name: '한강', kakaoPlaceId: null, address: null, createdAt }
    expect(exportManifestV1Schema.safeParse({ ...manifest, places: [place] }).success).toBe(true)
    expect(exportManifestV1Schema.safeParse({ ...manifest, places: [{ ...place, lat: 37.5, lng: 127 }] }).success).toBe(
      true,
    )
    expect(exportManifestV1Schema.safeParse({ ...manifest, places: [{ ...place, lat: 91, lng: 127 }] }).success).toBe(
      false,
    )
  })
})
