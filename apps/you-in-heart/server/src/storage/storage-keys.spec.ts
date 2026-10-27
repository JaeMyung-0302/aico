import {
  assertCouplePrefix,
  couplePrefixes,
  coupleIdFromLedgerKey,
  coupleIdFromUnlinkedLedgerKey,
  DELETED_USER_LEDGER_PREFIX,
  deletedUserLedgerKey,
  exportZipKey,
  photoDisplayKey,
  photoIncomingKey,
  photoOriginalKey,
  photoThumbKey,
  PURGE_LEDGER_PREFIX,
  purgeLedgerKey,
  quoteScreenshotIncomingKey,
  quoteScreenshotKey,
  quoteScreenshotThumbKey,
  UNLINKED_COUPLE_LEDGER_PREFIX,
  unlinkedCoupleLedgerKey,
  userIdFromDeletedLedgerKey,
} from './storage-keys'

const COUPLE_ID = '0199e3a0-0000-7000-8000-0000000000c1'
const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'
const PHOTO_ID = '0199e3a0-0000-7000-8000-0000000000f1'
const QUOTE_ID = '0199e3a0-0000-7000-8000-0000000000e1'

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

  it('deletedUserLedgerKey: system/deleted-users/{userId}, 역변환은 uuid일 때만', () => {
    expect(deletedUserLedgerKey(USER_ID)).toBe(`system/deleted-users/${USER_ID}`)
    expect(userIdFromDeletedLedgerKey(deletedUserLedgerKey(USER_ID))).toBe(USER_ID)
    expect(userIdFromDeletedLedgerKey(`${DELETED_USER_LEDGER_PREFIX}../c`)).toBeNull()
    expect(userIdFromDeletedLedgerKey(purgeLedgerKey(COUPLE_ID))).toBeNull()
  })

  it('unlinkedCoupleLedgerKey: system/unlinked-couples/{coupleId}, 역변환은 uuid일 때만', () => {
    expect(unlinkedCoupleLedgerKey(COUPLE_ID)).toBe(`system/unlinked-couples/${COUPLE_ID}`)
    expect(coupleIdFromUnlinkedLedgerKey(unlinkedCoupleLedgerKey(COUPLE_ID))).toBe(COUPLE_ID)
    expect(coupleIdFromUnlinkedLedgerKey(`${UNLINKED_COUPLE_LEDGER_PREFIX}x/${COUPLE_ID}`)).toBeNull()
    expect(coupleIdFromUnlinkedLedgerKey(purgeLedgerKey(COUPLE_ID))).toBeNull()
  })

  it.each([deletedUserLedgerKey, unlinkedCoupleLedgerKey, purgeLedgerKey])(
    '원장 키 생성기는 uuid가 아닌 id를 거부한다 (%#)',
    (toKey) => {
      expect(() => toKey('../../c')).toThrow()
      expect(() => toKey('')).toThrow()
    },
  )

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

  it('사진 원본·표시용·썸네일은 c/{coupleId}/p/{photoId}/ 아래, 표시용 후보는 incoming/{coupleId}/{photoId}', () => {
    const photoPrefix = `c/${COUPLE_ID}/p/${PHOTO_ID}/`
    expect(photoOriginalKey(COUPLE_ID, PHOTO_ID)).toBe(`${photoPrefix}o`)
    expect(photoDisplayKey(COUPLE_ID, PHOTO_ID)).toBe(`${photoPrefix}d.jpg`)
    expect(photoThumbKey(COUPLE_ID, PHOTO_ID)).toBe(`${photoPrefix}t.jpg`)
    expect(photoIncomingKey(COUPLE_ID, PHOTO_ID)).toBe(`incoming/${COUPLE_ID}/${PHOTO_ID}`)
    const [cPrefix, incomingPrefix] = couplePrefixes(COUPLE_ID)
    expect(
      [photoOriginalKey, photoDisplayKey, photoThumbKey].every((toKey) =>
        toKey(COUPLE_ID, PHOTO_ID).startsWith(cPrefix),
      ),
    ).toBe(true)
    expect(photoIncomingKey(COUPLE_ID, PHOTO_ID).startsWith(incomingPrefix)).toBe(true)
  })

  it.each([photoOriginalKey, photoDisplayKey, photoThumbKey, photoIncomingKey])(
    '사진 키 생성기는 uuid가 아닌 coupleId·photoId를 거부한다 (%#)',
    (toKey) => {
      expect(toKey(COUPLE_ID, PHOTO_ID)).toContain(PHOTO_ID)
      expect(() => toKey('../x', PHOTO_ID)).toThrow()
      expect(() => toKey(COUPLE_ID, '../../o')).toThrow()
      expect(() => toKey('', '')).toThrow()
      expect(() => toKey(COUPLE_ID.toUpperCase(), PHOTO_ID)).toThrow()
    },
  )

  it('내보내기 zip은 exports/{coupleId}/{jobId}.zip, uuid가 아니면 throw', () => {
    expect(exportZipKey(COUPLE_ID, PHOTO_ID)).toBe(`exports/${COUPLE_ID}/${PHOTO_ID}.zip`)
    expect(exportZipKey(COUPLE_ID, PHOTO_ID).startsWith(couplePrefixes(COUPLE_ID)[2])).toBe(true)
    expect(() => exportZipKey(COUPLE_ID, 'x/../y')).toThrow()
  })

  it('문구 스크린샷은 c/{coupleId}/q/{quoteId}/s.jpg·st.jpg, 업로드 후보는 incoming/{coupleId}/q/{quoteId} (purge 접두사 안)', () => {
    const [cPrefix, incomingPrefix] = couplePrefixes(COUPLE_ID)
    expect(quoteScreenshotKey(COUPLE_ID, QUOTE_ID)).toBe(`c/${COUPLE_ID}/q/${QUOTE_ID}/s.jpg`)
    expect(quoteScreenshotThumbKey(COUPLE_ID, QUOTE_ID)).toBe(`c/${COUPLE_ID}/q/${QUOTE_ID}/st.jpg`)
    expect(quoteScreenshotIncomingKey(COUPLE_ID, QUOTE_ID)).toBe(`incoming/${COUPLE_ID}/q/${QUOTE_ID}`)
    expect(quoteScreenshotKey(COUPLE_ID, QUOTE_ID).startsWith(cPrefix)).toBe(true)
    expect(quoteScreenshotIncomingKey(COUPLE_ID, QUOTE_ID).startsWith(incomingPrefix)).toBe(true)
  })

  it.each([quoteScreenshotKey, quoteScreenshotThumbKey, quoteScreenshotIncomingKey])(
    '문구 스크린샷 키 생성기는 uuid가 아닌 id를 거부한다 (%#)',
    (toKey) => {
      expect(() => toKey('../x', QUOTE_ID)).toThrow()
      expect(() => toKey(COUPLE_ID, '../../s.jpg')).toThrow()
    },
  )
})
