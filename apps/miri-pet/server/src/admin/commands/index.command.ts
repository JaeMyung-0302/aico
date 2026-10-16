import { type AdminCommand, type AdminServices, stripControlChars } from './admin-command'
import { placesCommands } from './places.command'
import { remindersRunCommand } from './reminders.command'
import { reportsListCommand, reportsResolveCommand } from './reports.command'
import { usersSuspendCommand } from './users.command'

export const ADMIN_COMMANDS: readonly AdminCommand[] = [
  reportsListCommand,
  reportsResolveCommand,
  usersSuspendCommand,
  remindersRunCommand,
  ...placesCommands,
]

const printUsage = (print: AdminServices['print']): void => {
  print('사용법: pnpm admin <command> [...args]')
  ADMIN_COMMANDS.forEach((command) => print(`  ${command.usage}`))
}

export const runAdminCommand = async (
  name: string | undefined,
  args: readonly string[],
  services: AdminServices,
): Promise<number> => {
  const command = ADMIN_COMMANDS.find((candidate) => candidate.name === name)
  if (!command) {
    printUsage(services.print)
    return 1
  }
  try {
    return await command.run(args, services)
  } catch (error) {
    services.print(`실패: ${stripControlChars(error instanceof Error ? error.message : String(error))}`)
    return 1
  }
}
