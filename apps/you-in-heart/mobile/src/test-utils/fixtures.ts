import type { Couple, MeResponse } from '@you-in-heart/shared'

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
