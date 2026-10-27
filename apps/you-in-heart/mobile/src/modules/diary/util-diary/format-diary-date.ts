import { computeDday } from '@you-in-heart/shared'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const weekdayOf = (isoDate: string): string => WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()] ?? ''

// SCR-05·06 "2026. 10. 25 (일)"
export const formatDiaryDate = (isoDate: string): string => `${isoDate.replaceAll('-', '. ')} (${weekdayOf(isoDate)})`

// SCR-07 카드 "10. 25 (일)"
export const formatShortDiaryDate = (isoDate: string): string =>
  `${isoDate.slice(5).replace('-', '. ')} (${weekdayOf(isoDate)})`

// 그날이 사귄 지 며칠째인지(사귄 날 = 1일째). 사귄 날 전이거나 모르면 null
export const dayCountOn = (startedOn: string | null, isoDate: string): number | null => {
  if (!startedOn) return null
  const { days } = computeDday(startedOn, `${isoDate}T12:00:00+09:00`)
  return days > 0 ? days : null
}

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3
const JONGSEONG_COUNT = 28

// "재명이 남김" / "민수가 남김" — 마지막 글자에 받침이 있으면 '이'
export const withSubjectParticle = (name: string): string => {
  const code = name.charCodeAt(name.length - 1)
  const isHangul = code >= HANGUL_START && code <= HANGUL_END
  const hasFinal = isHangul && (code - HANGUL_START) % JONGSEONG_COUNT !== 0
  return `${name}${hasFinal ? '이' : '가'}`
}
