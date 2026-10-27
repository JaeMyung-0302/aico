// 카카오톡 "대화 내보내기" txt 파서(architecture §9 D7). 기기 안에서만 돌리는 순수 함수 — 서버는 import하지 않는다.
// 원문 txt는 서버로 보내지 않고, 사용자가 고른 메시지만 POST /quotes/bulk로 보낸다.
// 지원 형식(한국어): Android "2026년 10월 18일 오후 9:05, A : 본문" / iOS "2026. 10. 18. 오후 9:05, A : 본문".
// 픽스처는 합성 샘플이라 실제 내보내기로 다시 확인해야 한다

export type KakaoMessage = {
  // 메시지 첫 줄 번호 기반('line-12'). 같은 입력이면 다시 파싱해도 같다(다중 선택 키)
  id: string
  speaker: string
  // KST(+09:00) ISO 8601. 내보내기 기기의 시간대를 알 수 없어 한국 시간으로 본다
  saidAt: string
  text: string
}

// 형식을 알 수 없는 줄(날짜 없는 고아 줄·시스템 메시지·지원하지 않는 형식). 화면에서 원문 그대로 고를 수 있다
export type KakaoUnparsedLine = { lineNo: number; raw: string }

export type KakaoExportParseResult = { messages: KakaoMessage[]; unparsed: KakaoUnparsedLine[] }

// 포맷별 정규식 2개: 날짜 · 오전/오후 · 시:분 · 화자 · 본문. 화자는 첫 " : " 앞까지(본문에 " : "가 있어도 된다)
const ANDROID_LINE = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2}), (.+?) : (.*)$/
const IOS_LINE = /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (오전|오후) (\d{1,2}):(\d{2}), (.+?) : (.*)$/
// 날짜·시각은 있지만 "화자 : 본문"이 아닌 줄(초대·나가기 같은 시스템 메시지)
const DATED_PREFIX = /^\d{4}(?:년 \d{1,2}월 \d{1,2}일|\. \d{1,2}\. \d{1,2}\.) (?:오전|오후) \d{1,2}:\d{2}, /

// 대화 구조 줄은 문구 후보가 아니라 버린다: 제목, 저장한 날짜, 날짜 구분선
const STRUCTURE_LINES: readonly RegExp[] = [
  /님과 카카오톡 대화$/,
  /^저장한 날짜 ?: /,
  /^\d{4}년 \d{1,2}월 \d{1,2}일 [월화수목금토일]요일$/,
]

// 첨부 자리 표시(본문 대신 들어가는 한 줄). 문구가 아니라 뺀다
const PLACEHOLDER_TEXT = /^(?:사진|사진 \d+장|동영상|이모티콘|음성메시지|파일: .+|삭제된 메시지입니다\.)$/

type MessageHead = { kind: 'message'; lineNo: number; speaker: string; saidAt: string; text: string }
type BreakLine = { kind: 'structure' | 'system'; lineNo: number; raw: string }
// 날짜가 없는 줄: 바로 앞 메시지의 이어지는 줄이거나, 앞에 메시지가 없으면 unparsed
type LooseLine = { kind: 'loose'; lineNo: number; raw: string }
type ClassifiedLine = MessageHead | BreakLine | LooseLine

const pad = (value: number): string => String(value).padStart(2, '0')

// 12시간제 → 24시간제(오전 12시 = 0시, 오후 12시 = 12시). 없는 날짜·시각이면 null
const toKstIso = (match: RegExpExecArray): string | null => {
  const [year, month, day, hour12, minute] = [match[1], match[2], match[3], match[5], match[6]].map(Number)
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour12 === undefined ||
    minute === undefined ||
    hour12 < 1 ||
    hour12 > 12 ||
    minute > 59
  ) {
    return null
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  const hour = (hour12 % 12) + (match[4] === '오후' ? 12 : 0)
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`
}

const toMessageHead = (raw: string, lineNo: number): MessageHead | null => {
  const match = ANDROID_LINE.exec(raw) ?? IOS_LINE.exec(raw)
  if (!match) return null
  const saidAt = toKstIso(match)
  const speaker = match[7]?.trim() ?? ''
  if (!saidAt || !speaker) return null
  return { kind: 'message', lineNo, speaker, saidAt, text: match[8] ?? '' }
}

const classify = (raw: string, index: number): ClassifiedLine => {
  const lineNo = index + 1
  const head = toMessageHead(raw, lineNo)
  if (head) return head
  if (STRUCTURE_LINES.some((pattern) => pattern.test(raw))) return { kind: 'structure', lineNo, raw }
  if (DATED_PREFIX.test(raw)) return { kind: 'system', lineNo, raw }
  return { kind: 'loose', lineNo, raw }
}

const isBlank = (line: LooseLine): boolean => line.raw.trim() === ''

type Segment = { head: MessageHead | BreakLine | null; tail: readonly LooseLine[] }

const toResult = ({ head, tail }: Segment): KakaoExportParseResult => {
  if (head?.kind === 'message') {
    const text = [head.text, ...tail.map((line) => line.raw)].join('\n').trimEnd()
    if (text.trim() === '' || PLACEHOLDER_TEXT.test(text)) return { messages: [], unparsed: [] }
    const message = { id: `line-${head.lineNo}`, speaker: head.speaker, saidAt: head.saidAt, text }
    return { messages: [message], unparsed: [] }
  }
  const orphans = tail.filter((line) => !isBlank(line))
  const lines = head?.kind === 'system' ? [head, ...orphans] : orphans
  return { messages: [], unparsed: lines.map(({ lineNo, raw }) => ({ lineNo, raw })) }
}

// 메시지·구조·시스템 줄을 경계로 자르고, 경계 사이의 날짜 없는 줄은 앞 경계에 붙인다(O(n))
export const parseKakaoExport = (input: string): KakaoExportParseResult => {
  const classified = input
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .map(classify)
  const boundaries = classified.flatMap((line, index) => (line.kind === 'loose' ? [] : [index]))
  const starts = [-1, ...boundaries]
  const segments = starts.map((start, position): Segment => {
    const end = starts[position + 1] ?? classified.length
    const head = start < 0 ? null : (classified[start] ?? null)
    const tail = classified.slice(start + 1, end).filter((line): line is LooseLine => line.kind === 'loose')
    return { head: head?.kind === 'loose' ? null : head, tail }
  })
  const results = segments.map(toResult)
  return {
    messages: results.flatMap((result) => result.messages),
    unparsed: results.flatMap((result) => result.unparsed),
  }
}
