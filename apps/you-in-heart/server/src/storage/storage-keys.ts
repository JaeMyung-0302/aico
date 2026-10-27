// R2 키는 이 파일에서만 만든다(ADR-002). 사진 키는 1D에서 추가
// c/{coupleId}/… 원본·표시용·썸네일·스크린샷, incoming/{coupleId}/… 표시용 후보(수명 주기 1일), exports/{coupleId}/… zip(7일)

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// purge 삭제 대상으로 허용하는 유일한 모양. 버킷 전체·다른 접두사를 지우는 사고를 막는다
const COUPLE_PREFIX_PATTERN = /^(c|incoming|exports)\/[0-9a-f-]{36}\/$/

export const PURGE_LEDGER_PREFIX = 'system/purge-ledger/'

export const couplePrefixes = (coupleId: string): readonly [string, string, string] => [
  `c/${coupleId}/`,
  `incoming/${coupleId}/`,
  `exports/${coupleId}/`,
]

// 빈 객체. 키에는 uuid만 들어간다(ADR-003: 백업 복원 후 purge:replay가 읽는다)
export const purgeLedgerKey = (coupleId: string): string => `${PURGE_LEDGER_PREFIX}${coupleId}`

export const coupleIdFromLedgerKey = (key: string): string | null => {
  if (!key.startsWith(PURGE_LEDGER_PREFIX)) return null
  const id = key.slice(PURGE_LEDGER_PREFIX.length)
  return UUID_PATTERN.test(id) ? id : null
}

export const assertCouplePrefix = (prefix: string): void => {
  if (!COUPLE_PREFIX_PATTERN.test(prefix)) throw new Error('허용되지 않은 삭제 접두사입니다')
}
