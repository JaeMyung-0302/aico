import cron from 'node-cron'
import { loadConfig } from './config.js'
import { getDb, closeDb } from './db.js'
import { scanTrends } from './pipeline/scan.js'
import { generatePosts } from './pipeline/generate.js'
import { publishPosts } from './pipeline/publish.js'
import {
  sendPipelineAlert,
  checkBudgetWarning,
  sendDailyReport,
} from './pipeline/alert.js'
import type { ContentBotConfig } from './types/index.js'
import type Database from 'better-sqlite3'
import type { PipelineResult } from './types/index.js'

let activePipeline: Promise<void> | null = null
let isShuttingDown = false

const runPipeline = async (
  config: ContentBotConfig,
  db: Database.Database,
): Promise<void> => {
  console.log('[Pipeline] 실행 시작:', new Date().toISOString())

  try {
    const keywords = await scanTrends(config, db)
    if (keywords.length === 0) {
      console.log('[Pipeline] 신규 키워드 없음. 종료.')
      return
    }

    const posts = await generatePosts(config, db, keywords)
    const publishResults = await publishPosts(config, db, posts)
    const totalTokenCost = posts.reduce((sum, p) => sum + p.tokenCost, 0)

    const result: PipelineResult = {
      keywords,
      posts,
      publishResults,
      totalTokenCost,
    }

    await sendPipelineAlert(config, result)
    await checkBudgetWarning(config, db)

    console.log(
      `[Pipeline] 완료: ${posts.length}개 생성, ${publishResults.filter((r) => r.success).length}개 발행`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[Pipeline] 치명적 에러: ${message}`)
  }
}

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[ContentBot] ${signal} 수신, 종료 대기 중...`)

  if (activePipeline) {
    await activePipeline.catch(() => {})
  }

  closeDb()
  process.exit(0)
}

const main = (): void => {
  const config = loadConfig()
  const db = getDb()

  console.log('[ContentBot] 시작됨')
  console.log(`[ContentBot] 스케줄: ${config.pipeline.cronSchedule}`)
  console.log(
    `[ContentBot] 일일 예산: ${config.pipeline.dailyBudgetKrw}원, 최대 ${config.pipeline.maxPostsPerDay}개/일`,
  )

  // 파이프라인 스케줄링
  cron.schedule(config.pipeline.cronSchedule, () => {
    if (isShuttingDown) return
    activePipeline = runPipeline(config, db)
    activePipeline
      .catch(() => {})
      .finally(() => {
        activePipeline = null
      })
  })

  // 일일 리포트 (매일 KST 23:50 = UTC 14:50)
  cron.schedule('50 14 * * *', () => {
    sendDailyReport(config, db).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[DailyReport] 전송 실패: ${msg}`)
    })
  })

  // 즉시 1회 실행
  activePipeline = runPipeline(config, db)
  activePipeline
    .catch(() => {})
    .finally(() => {
      activePipeline = null
    })

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}

main()
