import type { Vaccination } from '@miri-pet/shared'
import { daysBetween } from './vaccination-dates'

export type NextDue = { vaccination: Vaccination; dDay: number }

// 펫 한 마리의 다음 접종: 오늘(KST) 이후 가장 가까운 nextDueOn (서버 /vaccinations/upcoming과 같은 규칙)
export const nextDueFor = (vaccinations: readonly Vaccination[], today: string): NextDue | null => {
  // filter가 새 배열을 만들므로 sort가 입력을 바꾸지 않는다
  const upcoming = vaccinations
    .filter((v): v is Vaccination & { nextDueOn: string } => v.nextDueOn !== null && v.nextDueOn >= today)
    .sort((a, b) => a.nextDueOn.localeCompare(b.nextDueOn))
  const first = upcoming[0]
  return first ? { vaccination: first, dDay: daysBetween(today, first.nextDueOn) } : null
}
