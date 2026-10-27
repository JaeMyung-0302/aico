import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { quoteSchema } from '../../schemas/quote'
import { parseKakaoExport } from '../parse-export'

// 픽스처는 공개 포맷 자료로 만든 합성 샘플(화자 A·B, 본문 대체 문장). 실제 내보내기 샘플이 오면 교체·재검증한다
const fixture = (name: string): string => readFileSync(resolve(__dirname, '../__fixtures__', name), 'utf8')

const pick = (result: ReturnType<typeof parseKakaoExport>) =>
  result.messages.map(({ speaker, saidAt, text }) => ({ speaker, saidAt, text }))

describe('parseKakaoExport', () => {
  it('Android 한국어: 날짜 헤더·저장 정보는 건너뛰고, 오전·오후(자정 12시·정오 포함)를 KST ISO로', () => {
    const result = parseKakaoExport(fixture('android-ko.txt'))
    expect(pick(result)).toEqual([
      { speaker: 'A', saidAt: '2026-10-18T09:05:00+09:00', text: '좋은 아침' },
      { speaker: 'B', saidAt: '2026-10-18T09:06:00+09:00', text: '잘 잤어?' },
      { speaker: 'A', saidAt: '2026-10-18T12:30:00+09:00', text: '점심 뭐 먹을까' },
      { speaker: 'A', saidAt: '2026-10-18T23:59:00+09:00', text: '오늘 즐거웠어' },
      { speaker: 'B', saidAt: '2026-10-19T00:15:00+09:00', text: '자정 넘었다' },
      { speaker: 'A', saidAt: '2026-10-19T13:00:00+09:00', text: '오늘도 고마워' },
    ])
    expect(result.unparsed).toEqual([])
  })

  it('iOS 한국어(YYYY. M. D. 형식)도 같은 모양으로', () => {
    const result = parseKakaoExport(fixture('ios-ko.txt'))
    expect(pick(result)).toEqual([
      { speaker: 'A', saidAt: '2026-10-18T09:05:00+09:00', text: '좋은 아침' },
      { speaker: 'B', saidAt: '2026-10-18T12:00:00+09:00', text: '정오에 만나' },
      { speaker: 'B', saidAt: '2026-10-19T00:15:00+09:00', text: '자정 넘었다' },
      { speaker: 'A', saidAt: '2026-10-19T07:40:00+09:00', text: '출근 잘 해' },
    ])
    expect(result.unparsed).toEqual([])
  })

  it('사진·동영상·이모티콘 자리 표시 줄(사진 N장 포함)은 문구 후보에서 뺀다', () => {
    const texts = [fixture('android-ko.txt'), fixture('ios-ko.txt'), fixture('emoji.txt')].flatMap((input) =>
      parseKakaoExport(input).messages.map((message) => message.text),
    )
    expect(texts.filter((text) => /^(사진|동영상|이모티콘)/.test(text))).toEqual([])
  })

  it('멀티라인 메시지는 1건으로 합치고(가운데 빈 줄 유지, 끝 빈 줄 제거) 날짜 없는 고아 줄은 unparsed', () => {
    const result = parseKakaoExport(fixture('multiline.txt'))
    expect(pick(result)).toEqual([
      { speaker: 'A', saidAt: '2026-10-18T21:00:00+09:00', text: '첫 줄\n둘째 줄\n\n넷째 줄(가운데 빈 줄 포함)' },
      { speaker: 'B', saidAt: '2026-10-18T21:01:00+09:00', text: '한 줄 답장' },
      { speaker: 'B', saidAt: '2026-10-18T21:03:00+09:00', text: '마지막\n  들여쓴 이어지는 줄' },
    ])
    expect(result.unparsed).toEqual([
      { lineNo: 1, raw: '날짜 없는 머리 줄' },
      { lineNo: 8, raw: '2026년 10월 18일 오후 9:02, A님이 B님을 초대했습니다.' },
      { lineNo: 9, raw: '시스템 줄 다음의 고아 줄' },
    ])
  })

  it('이모지(ZWJ 시퀀스)·본문 속 " : "·이모지 이름을 그대로 둔다', () => {
    expect(pick(parseKakaoExport(fixture('emoji.txt')))).toEqual([
      { speaker: 'A', saidAt: '2026-10-18T20:00:00+09:00', text: '사랑해 ❤️🥰' },
      { speaker: 'B', saidAt: '2026-10-18T20:01:00+09:00', text: '👨‍👩‍👧 우리 미래' },
      { speaker: 'A', saidAt: '2026-10-18T20:03:00+09:00', text: ':) 콜론 : 이 들어간 문장' },
      { speaker: '🐰토끼', saidAt: '2026-10-18T20:04:00+09:00', text: '이모지 이름도 그대로' },
    ])
  })

  it('지원하지 않는 형식(PC 내보내기)은 messages 0건, 내용 줄은 전부 unparsed(머리·저장 정보 제외)', () => {
    const result = parseKakaoExport(fixture('unknown-format.txt'))
    expect(result.messages).toEqual([])
    expect(result.unparsed).toEqual([
      { lineNo: 4, raw: '--------------- 2026년 10월 18일 토요일 ---------------' },
      { lineNo: 5, raw: '[A] [오전 9:05] 좋은 아침' },
      { lineNo: 6, raw: '[B] [오전 9:06] 잘 잤어?' },
    ])
  })

  it('빈 파일·빈 줄만이면 둘 다 빈 배열', () => {
    expect(parseKakaoExport('')).toEqual({ messages: [], unparsed: [] })
    expect(parseKakaoExport('\n\n  \n')).toEqual({ messages: [], unparsed: [] })
  })

  it('BOM·CRLF 줄바꿈을 처리하고, id는 첫 줄 번호로 정해져 다시 파싱해도 같다', () => {
    const input = '﻿2026. 1. 2. 오전 1:02, A : 하나\r\n이어서\r\n2026. 1. 2. 오후 3:04, B : 둘\r\n'
    const first = parseKakaoExport(input)
    expect(first.messages).toEqual([
      { id: 'line-1', speaker: 'A', saidAt: '2026-01-02T01:02:00+09:00', text: '하나\n이어서' },
      { id: 'line-3', speaker: 'B', saidAt: '2026-01-02T15:04:00+09:00', text: '둘' },
    ])
    expect(parseKakaoExport(input)).toEqual(first)
  })

  it('존재하지 않는 날짜·시각(2월 30일, 13시)은 메시지로 보지 않는다', () => {
    const result = parseKakaoExport('2026년 2월 30일 오후 1:00, A : 없는 날\n2026. 3. 1. 오후 13:00, B : 없는 시각')
    expect(result.messages).toEqual([])
    expect(result.unparsed.map((line) => line.lineNo)).toEqual([1, 2])
  })

  it('saidAt은 문구 저장 API(quote saidAt)가 받는 ISO 형식', () => {
    const [message] = parseKakaoExport(fixture('android-ko.txt')).messages
    expect(quoteSchema.shape.saidAt.safeParse(message?.saidAt).success).toBe(true)
  })
})
