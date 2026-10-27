// R2 키는 이 파일에서만 만든다(ADR-002)
// c/{coupleId}/… 원본·표시용·썸네일·문구 스크린샷(q/), incoming/{coupleId}/… 표시용 후보(수명 주기 1일), exports/{coupleId}/… zip(7일)

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

const assertUuid = (...ids: readonly string[]): void => {
  if (!ids.every((id) => UUID_PATTERN.test(id))) throw new Error('키에는 uuid만 쓸 수 있습니다')
}

const photoKey = (coupleId: string, photoId: string, name: string): string => {
  assertUuid(coupleId, photoId)
  return `c/${coupleId}/p/${photoId}/${name}`
}

// 사진(architecture §6.2): o = EXIF 포함 원본 바이트 그대로, d.jpg·t.jpg = 서버 재인코딩(EXIF 없음)
export const photoOriginalKey = (coupleId: string, photoId: string): string => photoKey(coupleId, photoId, 'o')
export const photoDisplayKey = (coupleId: string, photoId: string): string => photoKey(coupleId, photoId, 'd.jpg')
export const photoThumbKey = (coupleId: string, photoId: string): string => photoKey(coupleId, photoId, 't.jpg')

// 기기가 만든 표시용 후보. complete가 재인코딩 후 지운다(수명 주기 1일 백업)
export const photoIncomingKey = (coupleId: string, photoId: string): string => {
  assertUuid(coupleId, photoId)
  return `incoming/${coupleId}/${photoId}`
}

// 문구 보관함 스크린샷(ADR-004): s.jpg = 표시용, st.jpg = 썸네일. 둘 다 서버 재인코딩(EXIF 없음)
export const quoteScreenshotKey = (coupleId: string, quoteId: string): string => {
  assertUuid(coupleId, quoteId)
  return `c/${coupleId}/q/${quoteId}/s.jpg`
}
export const quoteScreenshotThumbKey = (coupleId: string, quoteId: string): string => {
  assertUuid(coupleId, quoteId)
  return `c/${coupleId}/q/${quoteId}/st.jpg`
}

// 기기가 올린 스크린샷 원본. complete가 재인코딩 후 지운다(incoming/ 수명 주기 1일 백업)
export const quoteScreenshotIncomingKey = (coupleId: string, quoteId: string): string => {
  assertUuid(coupleId, quoteId)
  return `incoming/${coupleId}/q/${quoteId}`
}

// 내보내기 zip(수명 주기 7일)
export const exportZipKey = (coupleId: string, jobId: string): string => {
  assertUuid(coupleId, jobId)
  return `exports/${coupleId}/${jobId}.zip`
}

export const assertCouplePrefix = (prefix: string): void => {
  if (!COUPLE_PREFIX_PATTERN.test(prefix)) throw new Error('허용되지 않은 삭제 접두사입니다')
}
