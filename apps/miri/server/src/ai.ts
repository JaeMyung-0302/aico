import Anthropic from '@anthropic-ai/sdk'
import type { Composers, QuestionContext, WeeklyContext } from './dispatch.ts'
import { describeAnswer } from './tracks.ts'

/**
 * AI 는 문구만 쓴다. 선택지를 만들거나 값을 저장하거나 자유 입력을 해석하지 않는다.
 * 출력이 규칙에 어긋나거나 호출이 실패하면 호출부가 템플릿으로 떨어진다.
 * 사용자당 하루 트랙당 한 번, 일요일에 요약 한 번이라 비용은 무시할 수준이다.
 */

/**
 * 기본은 Opus 5. 사용자가 적을 때는 비용보다 문구 품질이 남는다.
 * 한 슬롯에 100건이 넘으면 AI_MODEL 환경변수로 Sonnet 5 로 내리거나 호출을 병렬화한다.
 */
export const DEFAULT_AI_MODEL = 'claude-opus-5'
const TIMEOUT_MS = 15_000
const DAILY_MAX_CHARS = 34
const WEEKLY_MAX_CHARS = 140
const WEEKLY_MAX_LINES = 3

const DAILY_SYSTEM = `당신은 "미리"라는 앱의 알림 문구 작가입니다. 미리는 사용자에게 먼저 묻고 버튼 한 번으로 하루를 기록하게 합니다.
규칙:
- 한국어 해요체, 한 줄, 물음표로 끝냅니다. 30자 이내.
- 이모지, 따옴표, 느낌표, 줄바꿈을 쓰지 않습니다.
- 잔소리, 칭찬 과잉, 설명을 하지 않습니다. 가볍고 짧게 묻습니다.
- 선택지를 나열하지 않습니다. 사용자는 버튼으로 답합니다.
- 예측이 주어지면 그 내용을 글자 그대로 포함해 "그게 맞는지" 확인하는 질문으로 씁니다.
- 문구만 출력합니다.`

const WEEKLY_SYSTEM = `당신은 "미리"라는 앱의 주간 요약 작가입니다. 아래에 트랙별 집계 한 줄씩이 주어집니다.
규칙:
- 한국어 해요체. 최대 3줄, 전체 140자 이내. 이모지와 느낌표를 쓰지 않습니다.
- 숫자를 다시 나열하지 말고 눈에 띄는 것 하나를 짚습니다. 빠진 것이 있으면 다음 주 제안을 한 줄로 덧붙입니다.
- 잔소리하지 않습니다. 기록이 없으면 다시 시작하자고만 합니다.
- 요약 문장만 출력합니다.`

function firstText(content: Anthropic.ContentBlock[]): string {
  const block = content.find((item): item is Anthropic.TextBlock => item.type === 'text')
  return (block?.text ?? '').trim()
}

/** 규칙에 맞는 한 줄인가. 예측이 있으면 그 설명이 그대로 들어 있어야 한다. */
export function acceptDailyText(text: string, predictionText: string | null): boolean {
  if (text.length === 0 || text.length > DAILY_MAX_CHARS) return false
  if (text.includes('\n') || !text.endsWith('?')) return false
  if (/[!"“”]/.test(text)) return false
  if (predictionText && !text.includes(predictionText)) return false
  return true
}

export function acceptWeeklyText(text: string): boolean {
  if (text.length === 0 || text.length > WEEKLY_MAX_CHARS) return false
  if (text.split('\n').length > WEEKLY_MAX_LINES) return false
  return !/[!]/.test(text)
}

export function dailyPrompt(ctx: QuestionContext): string {
  const predictionText = ctx.prediction ? describeAnswer(ctx.track, ctx.prediction) : null
  const lines = [
    `트랙: ${ctx.track.name}`,
    `이 트랙의 기본 문구 예시: ${ctx.track.templates.slice(0, 3).join(' / ')}`,
    `최근 7일 답: ${ctx.recent.length > 0 ? ctx.recent.join(', ') : '없음'}`,
    `이번 주 기록한 날: ${ctx.weekDays}일`,
    predictionText
      ? `예측: "${predictionText}" (이 문자열을 그대로 넣어 맞는지 확인하세요)`
      : '예측: 없음 (열린 질문으로)',
  ]
  return lines.join('\n')
}

export function weeklyPrompt(ctx: WeeklyContext): string {
  return ctx.lines.join('\n')
}

/** ANTHROPIC_API_KEY 가 있을 때만 만든다. 없으면 호출부가 템플릿을 쓴다. */
export function aiComposers(apiKey: string, model: string = DEFAULT_AI_MODEL): Composers {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 })

  return {
    daily: async (ctx) => {
      const response = await client.messages.create({
        model,
        max_tokens: 80,
        // 30자 한 줄이라 깊이 생각할 일이 없다. 낮음으로 고정해 응답을 빠르게 한다.
        output_config: { effort: 'low' },
        system: DAILY_SYSTEM,
        messages: [{ role: 'user', content: dailyPrompt(ctx) }],
      })
      const text = firstText(response.content)
      const predictionText = ctx.prediction ? describeAnswer(ctx.track, ctx.prediction) : null
      if (!acceptDailyText(text, predictionText)) throw new Error('daily text rejected')
      return text
    },
    weekly: async (ctx) => {
      const response = await client.messages.create({
        model,
        max_tokens: 200,
        output_config: { effort: 'low' },
        system: WEEKLY_SYSTEM,
        messages: [{ role: 'user', content: weeklyPrompt(ctx) }],
      })
      const text = firstText(response.content)
      if (!acceptWeeklyText(text)) throw new Error('weekly text rejected')
      return text
    },
  }
}
