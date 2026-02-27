import type Database from 'better-sqlite3'
import { sendTelegramMessage } from '../apis/telegram.js'
import { getDailyStats, getTodayTokenCost } from '../db.js'
import type { ContentBotConfig, PipelineResult } from '../types/index.js'

const BUDGET_WARNING_THRESHOLD = 0.8

const formatPipelineReport = (
  result: PipelineResult,
  config: ContentBotConfig,
): string => {
  const successCount = result.publishResults.filter((r) => r.success).length
  const failCount = result.publishResults.filter((r) => !r.success).length
  const budgetUsage = Math.round(
    (result.totalTokenCost / config.pipeline.dailyBudgetKrw) * 100,
  )

  const lines = [
    `*[ContentBot] 파이프라인 실행 완료*`,
    ``,
    `키워드 수집: ${result.keywords.length}개`,
    `글 생성: ${result.posts.length}개`,
    `발행 성공: ${successCount}개 / 실패: ${failCount}개`,
    `API 비용: ${result.totalTokenCost}원 (${budgetUsage}%)`,
  ]

  if (result.publishResults.some((r) => r.success && r.url)) {
    const urls = result.publishResults
      .filter((r) => r.success && r.url)
      .map((r) => `  - ${r.url}`)
      .join('\n')
    return [...lines, ``, `발행된 글:`, urls].join('\n')
  }

  return lines.join('\n')
}

export const sendPipelineAlert = async (
  config: ContentBotConfig,
  result: PipelineResult,
): Promise<void> => {
  const message = formatPipelineReport(result, config)
  await sendTelegramMessage(config, message)
}

export const checkBudgetWarning = async (
  config: ContentBotConfig,
  db: Database.Database,
): Promise<void> => {
  const todayCost = getTodayTokenCost(db)
  const threshold = config.pipeline.dailyBudgetKrw * BUDGET_WARNING_THRESHOLD

  if (todayCost >= threshold) {
    const usage = Math.round((todayCost / config.pipeline.dailyBudgetKrw) * 100)
    await sendTelegramMessage(
      config,
      `⚠️ *[ContentBot] 예산 경고*\n\n누적 비용: ${todayCost}원 (${usage}%)\n한도: ${config.pipeline.dailyBudgetKrw}원`,
    )
  }
}

export const sendDailyReport = async (
  config: ContentBotConfig,
  db: Database.Database,
): Promise<void> => {
  const stats = getDailyStats(db)
  const message = [
    `📊 *[ContentBot] 일일 리포트*`,
    ``,
    `총 글: ${stats.postCount}개`,
    `발행 성공: ${stats.successCount}개`,
    `발행 실패: ${stats.failCount}개`,
    `총 API 비용: ${stats.totalTokenCost}원`,
  ].join('\n')

  await sendTelegramMessage(config, message)
}
