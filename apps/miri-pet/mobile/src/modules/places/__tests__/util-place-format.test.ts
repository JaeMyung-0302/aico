import { categoryLabel, formatDistance, formatVerifiedLine, sizeRuleLabel, sourceLabel } from '../util-place-format'
import { makePlace } from '../__fixtures__/places'

describe('util-place-format', () => {
  it('업종·출처 라벨', () => {
    expect(categoryLabel('RESTAURANT')).toBe('음식점')
    expect(categoryLabel('HOSPITAL')).toBe('동물병원')
    expect(sourceLabel('PUBLIC_DATA')).toBe('공공데이터')
    expect(sourceLabel('TOUR_API')).toBe('한국관광공사')
    expect(sourceLabel('USER')).toBe('사용자 제보')
  })

  it('최종 확인일(KST 기준 날짜) + 출처', () => {
    // UTC 10-01 15:30 = KST 10-02 00:30
    expect(formatVerifiedLine(makePlace({ verifiedAt: '2026-10-01T15:30:00.000Z' }))).toBe(
      '최종 확인 2026.10.02 · 출처: 공공데이터',
    )
    expect(formatVerifiedLine(makePlace({ verifiedAt: null, source: 'KAKAO' }))).toBe('최종 확인일 없음 · 출처: 카카오')
  })

  it('크기·실내 조건 요약', () => {
    expect(sizeRuleLabel(['S', 'M', 'L'], true)).toBe('대형견까지 · 실내 동반')
    expect(sizeRuleLabel(['S'], false)).toBe('소형견만 · 실외만')
    expect(sizeRuleLabel(['S', 'M'], false)).toBe('중형견까지 · 실외만')
    expect(sizeRuleLabel([], false)).toBe('크기 정보 없음 · 실외만')
  })

  it('거리 표시', () => {
    expect(formatDistance(0.3204)).toBe('320m')
    expect(formatDistance(1.234)).toBe('1.2km')
  })
})
