import { type AdminCommand, stripControlChars } from './admin-command'

const DEFAULT_LIST_LIMIT = 50
const RESOLVE_ACTIONS = ['hide', 'dismiss'] as const
type ResolveAction = (typeof RESOLVE_ACTIONS)[number]

const isResolveAction = (value: string | undefined): value is ResolveAction =>
  RESOLVE_ACTIONS.some((action) => action === value)

export const reportsListCommand: AdminCommand = {
  name: 'reports:list',
  usage: 'reports:list [limit=50]  대기 중인 신고(오래된 순)',
  run: async (args, { reports, print }) => {
    const limit = Number(args[0] ?? DEFAULT_LIST_LIMIT)
    const rows = await reports.listPending(Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_LIST_LIMIT)
    if (rows.length === 0) print('대기 중인 신고가 없습니다')
    rows.forEach((row) =>
      print(
        [
          row.id,
          row.createdAt.toISOString(),
          row.targetType,
          row.targetId,
          row.reason,
          row.reporterId ?? '-',
          row.detail ?? '',
        ]
          .map(stripControlChars)
          .join('\t'),
      ),
    )
    return 0
  },
}

export const reportsResolveCommand: AdminCommand = {
  name: 'reports:resolve',
  usage: 'reports:resolve <reportId> hide|dismiss  같은 대상의 대기 신고를 함께 처리',
  run: async (args, { reports, print }) => {
    const [reportId, action] = args
    if (!reportId || !isResolveAction(action)) {
      print('사용법: reports:resolve <reportId> hide|dismiss')
      return 1
    }
    const { updated } = await reports.resolve(reportId, action)
    print(`${action} 처리 완료: 신고 ${updated}건`)
    return 0
  },
}
