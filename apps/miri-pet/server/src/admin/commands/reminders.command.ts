import { NestFactory } from '@nestjs/core'
import { ReminderRunnerModule } from '../../vaccinations/reminder-runner.module'
import { type ReminderRunResult, VaccinationReminderService } from '../../vaccinations/vaccination-reminder.service'
import type { AdminCommand } from './admin-command'

type ReminderRunnerHandle = {
  runner: { runOnce: () => Promise<ReminderRunResult> }
  close: () => Promise<void>
}

// 리마인더 전용 컨텍스트를 따로 띄운다 → index.command.ts·AdminServices(Phase 3와 공유)를 건드리지 않는다
const openReminderRunner = async (): Promise<ReminderRunnerHandle> => {
  const context = await NestFactory.createApplicationContext(ReminderRunnerModule, { logger: ['error', 'warn'] })
  return { runner: context.get(VaccinationReminderService), close: () => context.close() }
}

// Phase 2 (plan 2.8b): 매일 10:00 KST 크론과 같은 실행 함수를 지금 1회 호출한다. 재실행해도 NotificationLog가 중복 발송을 막는다
export const runRemindersNow = async (
  open: () => Promise<ReminderRunnerHandle>,
  print: (line: string) => void,
): Promise<number> => {
  const { runner, close } = await open()
  try {
    const { today, candidates, sent, skipped } = await runner.runOnce()
    print(`KST ${today}: 대상 ${candidates}건, 발송 ${sent}건, 이미 보냄 ${skipped}건`)
    return 0
  } finally {
    await close()
  }
}

export const createRemindersRunNowCommand = (open: () => Promise<ReminderRunnerHandle>): AdminCommand => ({
  name: 'reminders:run-now',
  usage: 'reminders:run-now  접종 리마인더(D-7·D-1)를 지금 1회 실행 (이미 보낸 알림은 건너뜀)',
  run: (_args, { print }) => runRemindersNow(open, print),
})

export const remindersRunCommand = createRemindersRunNowCommand(openReminderRunner)
