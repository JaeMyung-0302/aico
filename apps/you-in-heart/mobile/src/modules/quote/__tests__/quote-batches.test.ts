import { MAX_QUOTE_REQUEST_BYTES, MAX_QUOTES_PER_BULK } from '@you-in-heart/shared'
import { chunkQuoteBatches, toQuoteItem, utf8ByteLength } from '../util-quote/quote-batches'

describe('toQuoteItem (선택 → 요청 항목)', () => {
  it('메시지는 본문 2000자·화자 50자로 자르고 saidAt 을 싣는다', () => {
    const item = toQuoteItem({ kind: 'message', id: 'line-1', speaker: 'A'.repeat(60), saidAt: '2026-03-14T23:42:00+09:00', text: '가'.repeat(2100) })
    expect(item.text).toHaveLength(2000)
    expect(item.speakerLabel).toHaveLength(50)
    expect(item.saidAt).toBe('2026-03-14T23:42:00+09:00')
  })

  it('못 읽은 줄은 원문만 문구로 보낸다', () => {
    expect(toQuoteItem({ kind: 'raw', lineNo: 7, raw: '이상한 줄' })).toEqual({ text: '이상한 줄' })
  })
})

describe('chunkQuoteBatches', () => {
  it('200건씩 나눈다', () => {
    const items = Array.from({ length: 450 }, (_, index) => ({ text: `문구 ${index}` }))
    expect(chunkQuoteBatches(items).map((batch) => batch.length)).toEqual([200, 200, 50])
    expect(MAX_QUOTES_PER_BULK).toBe(200)
  })

  it('직렬화한 본문이 MAX_QUOTE_REQUEST_BYTES 를 넘지 않게 나눈다 (한글은 3바이트)', () => {
    const items = Array.from({ length: 40 }, () => ({ text: '가'.repeat(2000) }))
    const batches = chunkQuoteBatches(items)
    expect(batches.length).toBeGreaterThan(1)
    batches.forEach((batch) => expect(utf8ByteLength(JSON.stringify({ items: batch }))).toBeLessThanOrEqual(MAX_QUOTE_REQUEST_BYTES))
    expect(batches.flat()).toHaveLength(40)
  })

  it('utf8ByteLength: ASCII 1, 한글 3, 이모지 4바이트', () => {
    expect(utf8ByteLength('a가😀')).toBe(8)
  })
})
