// R2 키는 이 파일에서만 만든다(ADR-002). 사진 키는 1D에서 추가
// c/{coupleId}/… 원본·표시용·썸네일·스크린샷, incoming/{coupleId}/… 표시용 후보(수명 주기 1일), exports/{coupleId}/… zip(7일)

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// purge 삭제 대상으로 허용하는 유일한 모양. 버킷 전체·다른 접두사를 지우는 사고를 막는다
const COUPLE_PREFIX_PATTERN = /^(c|incoming|exports)\/[0-9a-f-]{36}\/$/

export const couplePrefixes = (coupleId: string): readonly [string, string, string] => [
  `c/${coupleId}/`,
  `incoming/${coupleId}/`,
  `exports/${coupleId}/`,
]

// 원장(ADR-003): 백업 복원 후 purge:replay가 읽어 삭제·해제를 다시 적용한다. 키에는 uuid만 들어간다
export const PURGE_LEDGER_PREFIX = 'system/purge-ledger/'
export const DELETED_USER_LEDGER_PREFIX = 'system/deleted-users/'
export const UNLINKED_COUPLE_LEDGER_PREFIX = 'system/unlinked-couples/'

const ledgerKey = (prefix: string, id: string): string => {
  if (!UUID_PATTERN.test(id)) throw new Error('원장 키에는 uuid만 쓸 수 있습니다')
  return `${prefix}${id}`
}

const idFromLedgerKey = (prefix: string, key: string): string | null => {
  if (!key.startsWith(prefix)) return null
  const id = key.slice(prefix.length)
  return UUID_PATTERN.test(id) ? id : null
}

// purge된 커플(빈 객체)
export const purgeLedgerKey = (coupleId: string): string => ledgerKey(PURGE_LEDGER_PREFIX, coupleId)
export const coupleIdFromLedgerKey = (key: string): string | null => idFromLedgerKey(PURGE_LEDGER_PREFIX, key)

// 탈퇴한 사용자(빈 객체)
export const deletedUserLedgerKey = (userId: string): string => ledgerKey(DELETED_USER_LEDGER_PREFIX, userId)
export const userIdFromDeletedLedgerKey = (key: string): string | null =>
  idFromLedgerKey(DELETED_USER_LEDGER_PREFIX, key)

// 연결 해제 유예 중인 커플(본문 JSON { purgeAfter }). 재연결하면 지운다
export const unlinkedCoupleLedgerKey = (coupleId: string): string => ledgerKey(UNLINKED_COUPLE_LEDGER_PREFIX, coupleId)
export const coupleIdFromUnlinkedLedgerKey = (key: string): string | null =>
  idFromLedgerKey(UNLINKED_COUPLE_LEDGER_PREFIX, key)

export const assertCouplePrefix = (prefix: string): void => {
  if (!COUPLE_PREFIX_PATTERN.test(prefix)) throw new Error('허용되지 않은 삭제 접두사입니다')
}
