import {
  type BulkCreateQuotesRequest,
  type KakaoMessage,
  type KakaoUnparsedLine,
  MAX_QUOTE_REQUEST_BYTES,
  MAX_QUOTES_PER_BULK,
} from '@you-in-heart/shared'

export type QuoteItem = BulkCreateQuotesRequest['items'][number]

// 가져오기 화면에서 고른 것: 파싱된 메시지 또는 못 읽은 줄(원문 그대로)
export type ImportSelection = ({ kind: 'message' } & KakaoMessage) | ({ kind: 'raw' } & KakaoUnparsedLine)

const MAX_TEXT_LENGTH = 2000
const MAX_SPEAKER_LENGTH = 50
// {"items":[...]} 껍데기·쉼표 여유
const ENVELOPE_BYTES = 32

// 코드 포인트 단위로 자른다(이모지 반쪽이 남지 않게)
export const truncate = (value: string, max: number): string => Array.from(value).slice(0, max).join('')

export const toQuoteItem = (selection: ImportSelection): QuoteItem => {
  if (selection.kind === 'raw') return { text: truncate(selection.raw.trim(), MAX_TEXT_LENGTH) }
  return {
    text: truncate(selection.text, MAX_TEXT_LENGTH),
    speakerLabel: truncate(selection.speaker, MAX_SPEAKER_LENGTH),
    saidAt: selection.saidAt,
  }
}

// UTF-8 바이트 수 (서버의 64KB 상한은 바이트 기준)
export const utf8ByteLength = (value: string): number =>
  Array.from(value).reduce((sum, char) => {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x80) return sum + 1
    if (code < 0x800) return sum + 2
    return sum + (code < 0x10000 ? 3 : 4)
  }, 0)

type Batch = { items: QuoteItem[]; bytes: number }

// 200건과 직렬화 본문 MAX_QUOTE_REQUEST_BYTES 를 함께 지켜 나눈다 (항목 하나는 최대 2000자 ≈ 8KB 라 늘 들어간다)
export const chunkQuoteBatches = (items: readonly QuoteItem[]): QuoteItem[][] =>
  items
    .reduce<Batch[]>((batches, item) => {
      const size = utf8ByteLength(JSON.stringify(item)) + 1
      const last = batches.at(-1)
      const fits = last && last.items.length < MAX_QUOTES_PER_BULK && last.bytes + size <= MAX_QUOTE_REQUEST_BYTES
      if (!last || !fits) return [...batches, { items: [item], bytes: ENVELOPE_BYTES + size }]
      return [...batches.slice(0, -1), { items: [...last.items, item], bytes: last.bytes + size }]
    }, [])
    .map((batch) => batch.items)
