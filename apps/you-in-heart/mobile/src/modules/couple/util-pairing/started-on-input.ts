import { isoDateSchema, toKstDate } from '@you-in-heart/shared'

// 숫자만 받아 'YYYY-MM-DD' 로 맞춰 준다 (날짜 선택기 없이 숫자 키패드로 입력)
export const formatStartedOnInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter((part) => part.length > 0)
  return parts.join('-')
}

// 올바른 날짜이고 오늘(KST) 이후가 아니면 true
export const isValidStartedOn = (value: string, nowMs: number): boolean =>
  isoDateSchema.safeParse(value).success && value <= toKstDate(nowMs)

// 설정 화면 표기 "2025. 09. 10"
export const formatDotDate = (isoDate: string): string => isoDate.replaceAll('-', '. ')
