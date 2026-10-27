import { performance } from 'node:perf_hooks'
import { parseKakaoExport } from '../parse-export'

const LINE_COUNT = 10_000
const BUDGET_MS = 3_000

// 1만 줄: Android·iOS 형식 메시지, 멀티라인, 자리 표시 줄, 날짜 헤더를 섞는다
const generate = (count: number): string =>
  Array.from({ length: count }, (_, index) => {
    const minute = String(index % 60).padStart(2, '0')
    const hour = (index % 12) + 1
    const half = index % 2 === 0 ? '오전' : '오후'
    switch (index % 7) {
      case 0:
        return `2026년 10월 18일 ${half} ${hour}:${minute}, A : 메시지 ${index} 사랑해 ❤️`
      case 1:
        return `2026. 10. 18. ${half} ${hour}:${minute}, B : 답장 ${index}`
      case 2:
        return `이어지는 줄 ${index}`
      case 3:
        return `2026년 10월 18일 ${half} ${hour}:${minute}, B : 사진`
      case 4:
        return '2026년 10월 19일 일요일'
      case 5:
        return ''
      default:
        return `2026년 10월 19일 ${half} ${hour}:${minute}, A : ${'긴 문장 '.repeat(20)}`
    }
  }).join('\n')

describe('parseKakaoExport 성능', () => {
  it(`${LINE_COUNT.toLocaleString()}줄을 ${BUDGET_MS}ms 안에 파싱한다`, () => {
    const input = generate(LINE_COUNT)
    const started = performance.now()
    const result = parseKakaoExport(input)
    const elapsed = performance.now() - started

    process.stdout.write(
      `kakao parse perf: ${LINE_COUNT} lines in ${elapsed.toFixed(1)}ms (messages=${result.messages.length}, unparsed=${result.unparsed.length})\n`,
    )
    expect(elapsed).toBeLessThan(BUDGET_MS)
    expect(result.messages.length).toBeGreaterThan(LINE_COUNT / 3)
  })
})
