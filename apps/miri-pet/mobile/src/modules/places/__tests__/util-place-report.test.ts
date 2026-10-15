import { buildPlaceReportRequest, parseReportLocation, type PlaceReportDraft } from '../util-place-report'
import { makePlace } from '../__fixtures__/places'

const draftFrom = (overrides: Partial<PlaceReportDraft> = {}): PlaceReportDraft => {
  const place = makePlace()
  return {
    kind: 'EDIT',
    name: place.name,
    address: place.address,
    category: place.category,
    allowedSizes: place.allowedSizes,
    indoorAllowed: place.indoorAllowed,
    conditionsNote: place.conditionsNote ?? '',
    note: '',
    ...overrides,
  }
}

describe('buildPlaceReportRequest', () => {
  const place = makePlace()

  it('정보 수정: 바뀐 필드와 메모만 보낸다', () => {
    const result = buildPlaceReportRequest(draftFrom({ allowedSizes: ['S'], note: '대형견 불가로 바뀜' }), { place })
    expect(result).toEqual({
      ok: true,
      request: { kind: 'EDIT', placeId: place.id, allowedSizes: ['S'], note: '대형견 불가로 바뀜' },
    })
  })

  it('정보 수정인데 바뀐 것도 메모도 없으면 에러', () => {
    expect(buildPlaceReportRequest(draftFrom(), { place })).toEqual({
      ok: false,
      message: '바뀐 내용을 알려주세요',
    })
  })

  it('폐업·동반 불가: placeId + 메모', () => {
    expect(buildPlaceReportRequest(draftFrom({ kind: 'CLOSED', note: '' }), { place })).toEqual({
      ok: true,
      request: { kind: 'CLOSED', placeId: place.id },
    })
  })

  it('새 장소: 지도 중심 좌표와 필수 항목', () => {
    const draft = draftFrom({ kind: 'NEW', name: ' 새 카페 ', address: '서울 마포구', conditionsNote: '', note: '' })
    expect(buildPlaceReportRequest(draft, { location: { lat: 37.56, lng: 126.92 } })).toEqual({
      ok: true,
      request: {
        kind: 'NEW',
        name: '새 카페',
        address: '서울 마포구',
        category: 'CAFE',
        allowedSizes: ['S', 'M', 'L'],
        indoorAllowed: true,
        lat: 37.56,
        lng: 126.92,
      },
    })
  })

  it('새 장소 검증: 이름·주소·크기 필수, 위치 필수', () => {
    expect(buildPlaceReportRequest(draftFrom({ kind: 'NEW', name: ' ' }), { location: { lat: 1, lng: 1 } })).toEqual({
      ok: false,
      message: '장소 이름을 입력해 주세요',
    })
    expect(buildPlaceReportRequest(draftFrom({ kind: 'NEW', address: '' }), { location: { lat: 1, lng: 1 } })).toEqual({
      ok: false,
      message: '주소를 입력해 주세요',
    })
    expect(
      buildPlaceReportRequest(draftFrom({ kind: 'NEW', allowedSizes: [] }), { location: { lat: 1, lng: 1 } }),
    ).toEqual({
      ok: false,
      message: '함께 갈 수 있는 크기를 하나 이상 골라주세요',
    })
    expect(buildPlaceReportRequest(draftFrom({ kind: 'NEW' }), {})).toEqual({
      ok: false,
      message: '장소 탭의 지도에서 위치를 정한 뒤 제보해 주세요',
    })
  })
})

describe('parseReportLocation', () => {
  it('두 값이 모두 숫자일 때만 좌표', () => {
    expect(parseReportLocation('37.5', '127.1')).toEqual({ lat: 37.5, lng: 127.1 })
    expect(parseReportLocation(undefined, '127.1')).toBeUndefined()
    expect(parseReportLocation('abc', '127.1')).toBeUndefined()
  })
})
