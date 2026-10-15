import { NestFactory } from '@nestjs/core'
import { ReportService } from '../moderation/report.service'
import { UserSuspensionService } from '../moderation/user-suspension.service'
import { type PlaceImportOptions, PlaceImportService } from '../places/import/place-import.service'
import { PlaceReportReviewService } from '../places/place-report-review.service'
import { AdminModule } from './admin.module'
import { runAdminCommand } from './commands/index.command'

// 두 서비스를 places:* 명령용 하나로 묶는다(메서드 this 바인딩 유지)
const placesAdminServices = (importer: PlaceImportService, review: PlaceReportReviewService) => ({
  importFromFile: (path: string, options?: PlaceImportOptions) => importer.importFromFile(path, options),
  listPendingReports: (limit: number) => review.listPendingReports(limit),
  approveReport: (reportId: string) => review.approveReport(reportId),
  rejectReport: (reportId: string) => review.rejectReport(reportId),
})

// 사용: pnpm --filter @miri-pet/server admin reports:list (빌드 산출물 dist/admin/admin.cli.js 실행)
const main = async (): Promise<void> => {
  const [name, ...args] = process.argv.slice(2)
  const app = await NestFactory.createApplicationContext(AdminModule, { logger: ['error', 'warn'] })
  try {
    process.exitCode = await runAdminCommand(name, args, {
      reports: app.get(ReportService),
      suspension: app.get(UserSuspensionService),
      places: placesAdminServices(app.get(PlaceImportService), app.get(PlaceReportReviewService)),
      print: (line) => process.stdout.write(`${line}\n`),
    })
  } finally {
    await app.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`)
  process.exit(1)
})
