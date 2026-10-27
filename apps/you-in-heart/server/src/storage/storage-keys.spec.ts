import {
  assertCouplePrefix,
  couplePrefixes,
  coupleIdFromLedgerKey,
  PURGE_LEDGER_PREFIX,
  purgeLedgerKey,
} from './storage-keys'

const COUPLE_ID = '0199e3a0-0000-7000-8000-0000000000c1'

describe('storage-keys', () => {
  it('couplePrefixes: 커플당 접두사 3개(c/·incoming/·exports/)', () => {
    expect(couplePrefixes(COUPLE_ID)).toEqual([`c/${COUPLE_ID}/`, `incoming/${COUPLE_ID}/`, `exports/${COUPLE_ID}/`])
  })

  it('purgeLedgerKey: system/purge-ledger/{coupleId}, 역변환은 uuid일 때만', () => {
    expect(purgeLedgerKey(COUPLE_ID)).toBe(`system/purge-ledger/${COUPLE_ID}`)
    expect(coupleIdFromLedgerKey(purgeLedgerKey(COUPLE_ID))).toBe(COUPLE_ID)
    expect(coupleIdFromLedgerKey(`${PURGE_LEDGER_PREFIX}../c`)).toBeNull()
    expect(coupleIdFromLedgerKey(`c/${COUPLE_ID}`)).toBeNull()
  })

  it.each(couplePrefixes(COUPLE_ID))('assertCouplePrefix: %s 통과', (prefix) => {
    expect(() => assertCouplePrefix(prefix)).not.toThrow()
  })

  it.each([
    ['빈 문자열', ''],
    ['버킷 전체', '/'],
    ['c/ 전체', 'c/'],
    ['uuid 아님', 'c/not-a-uuid/'],
    ['끝 슬래시 없음', `c/${COUPLE_ID}`],
    ['다른 접두사', `system/${COUPLE_ID}/`],
    ['하위 경로', `c/${COUPLE_ID}/p/`],
  ])('assertCouplePrefix: %s는 throw', (_label, prefix) => {
    expect(() => assertCouplePrefix(prefix)).toThrow()
  })
})
