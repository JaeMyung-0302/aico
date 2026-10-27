import { type AnniversaryItem, computeAnniversaries, type Couple, type MeResponse } from '@you-in-heart/shared'

// 화면 테스트 공용 픽스처 (uuid v7 모양)
export const ME_ID = '01890a5d-ac96-774b-bcce-b302099a8057'
export const PARTNER_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
export const COUPLE_ID = '01890a5d-ac96-774b-bcce-b302099a8001'

export const ACTIVE_COUPLE: Couple = {
  id: COUPLE_ID,
  status: 'ACTIVE',
  startedOn: '2025-09-10',
  members: [
    { userId: ME_ID, displayName: '재명', slot: 1, reconnectConfirmedAt: null },
    { userId: PARTNER_ID, displayName: '지은', slot: 2, reconnectConfirmedAt: null },
  ],
  unlinkRequestedAt: null,
  unlinkRequestedBy: null,
  purgeAfter: null,
}

export const toSummary = ({ id, status, startedOn, purgeAfter }: Couple) => ({ id, status, startedOn, purgeAfter })

export const ME: MeResponse = {
  id: ME_ID,
  displayName: '재명',
  consents: { terms: true, privacy: true, location: false },
  couple: toSummary(ACTIVE_COUPLE),
}

// 기념일 화면·위젯 테스트 기준 시각: KST 2026-10-27 12:00 (시안 SCR-03·04 숫자와 같다: 413일, 500일 D-87)
export const FIXED_NOW_MS = Date.parse('2026-10-27T03:00:00.000Z')
export const CUSTOM_ANNIVERSARY_ID = '01890a5d-ac96-774b-bcce-b302099a8101'
export const CUSTOM_ANNIVERSARIES = [{ id: CUSTOM_ANNIVERSARY_ID, title: '처음 만난 날', date: '2025-08-23' }]

// GET /anniversaries?from=2025-10-27&to=2027-10-27 응답 흉내 — 서버와 같은 shared 계산을 쓴다
export const ANNIVERSARY_ITEMS: AnniversaryItem[] = computeAnniversaries({
  startedOn: '2025-09-10',
  customs: CUSTOM_ANNIVERSARIES,
  today: '2025-10-27',
  horizonDays: 730,
})

// Date.now 를 FIXED_NOW_MS 에서 시작해 실제 시간만큼 흐르게 한다. 멈춘 시계는 waitFor 의 시간 초과를 막아 실패 시 멈춘다
export const mockClockAt = (startMs: number): void => {
  const realNow = Date.now.bind(Date)
  const startedAt = realNow()
  jest.spyOn(Date, 'now').mockImplementation(() => startMs + (realNow() - startedAt))
}
