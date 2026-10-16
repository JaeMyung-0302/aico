import { parsePlaceImportFile } from './place-import-record'

const valid = {
  source: 'PUBLIC_DATA',
  sourceRef: 'pd-001',
  name: '숲길 카페',
  category: 'CAFE',
  address: '서울 성동구 성수동 1',
  lat: 37.544,
  lng: 127.056,
  allowedSizes: ['S', 'M'],
  indoorAllowed: true,
}

describe('parsePlaceImportFile', () => {
  it('정상 레코드는 그대로 통과(선택 필드 기본값 포함)', () => {
    const result = parsePlaceImportFile([valid])
    expect(result.records).toEqual([{ ...valid, conditionsNote: null, verifiedAt: null }])
    expect(result.skipped).toEqual({ missingCoordinates: 0, invalid: 0 })
  })

  it('좌표가 없거나 0,0이면 건너뛰고 건수를 센다', () => {
    const withoutLat = { ...valid, lat: undefined }
    const result = parsePlaceImportFile([withoutLat, { ...valid, sourceRef: 'pd-2', lat: 0, lng: 0 }, valid])
    expect(result.records).toHaveLength(1)
    expect(result.skipped.missingCoordinates).toBe(2)
  })

  it('형식이 틀린 레코드(sourceRef 없음·업종 오타)는 invalid로 센다', () => {
    const withoutRef = { ...valid, sourceRef: undefined }
    const result = parsePlaceImportFile([withoutRef, { ...valid, category: 'BAR' }])
    expect(result.records).toHaveLength(0)
    expect(result.skipped.invalid).toBe(2)
  })

  it('verifiedAt(YYYY-MM-DD)을 Date로 바꾼다', () => {
    const [record] = parsePlaceImportFile([{ ...valid, verifiedAt: '2026-10-02' }]).records
    expect(record?.verifiedAt).toEqual(new Date('2026-10-02T00:00:00.000Z'))
  })

  it('같은 (source, sourceRef)가 파일에 두 번 있으면 마지막 것만 남긴다', () => {
    const result = parsePlaceImportFile([valid, { ...valid, name: '바뀐 이름' }])
    expect(result.records.map((r) => r.name)).toEqual(['바뀐 이름'])
  })

  it('배열이 아니면 예외', () => {
    expect(() => parsePlaceImportFile({ items: [] })).toThrow('배열')
  })
})
