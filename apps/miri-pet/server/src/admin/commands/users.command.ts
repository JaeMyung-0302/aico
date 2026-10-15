import type { AdminCommand } from './admin-command'

export const usersSuspendCommand: AdminCommand = {
  name: 'users:suspend',
  usage: 'users:suspend <userId>  이용 정지 + 세션 전부 폐기',
  run: async (args, { suspension, print }) => {
    const [userId] = args
    if (!userId) {
      print('사용법: users:suspend <userId>')
      return 1
    }
    await suspension.suspend(userId)
    print(`정지 완료: ${userId}`)
    return 0
  },
}
