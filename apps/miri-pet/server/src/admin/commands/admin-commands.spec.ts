import type { AdminServices } from './admin-command'
import { stripControlChars } from './admin-command'
import { ADMIN_COMMANDS, runAdminCommand } from './index.command'

const REPORT_ID = '0199e3a0-0000-7000-8000-0000000000r1'
const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'

const makeServices = () => {
  const lines: string[] = []
  const services = {
    reports: { listPending: jest.fn(), resolve: jest.fn() },
    suspension: { suspend: jest.fn() },
    places: {
      importFromFile: jest.fn(),
      listPendingReports: jest.fn(),
      approveReport: jest.fn(),
      rejectReport: jest.fn(),
    },
    print: (line: string) => {
      lines.push(line)
    },
  } satisfies AdminServices
  return { services, lines }
}

describe('admin CLI 명령', () => {
  it('레지스트리에 명령이 등록돼 있다(reminders:run-now는 reminders.command.spec.ts, places:*는 places.command.spec.ts)', () => {
    expect(ADMIN_COMMANDS.map((c) => c.name).sort()).toEqual(
      [
        'places:approve',
        'places:import',
        'places:reject',
        'places:reports',
        'reminders:run-now',
        'reports:list',
        'reports:resolve',
        'users:suspend',
      ].sort(),
    )
  })

  it('알 수 없는 명령은 사용법을 출력하고 1', async () => {
    const { services, lines } = makeServices()
    await expect(runAdminCommand('nope', [], services)).resolves.toBe(1)
    expect(lines.join('\n')).toContain('reports:list')
  })

  it('명령 없이 실행해도 사용법 + 1', async () => {
    const { services } = makeServices()
    await expect(runAdminCommand(undefined, [], services)).resolves.toBe(1)
  })

  it('reports:list는 대기 신고를 한 줄씩 출력한다(기본 50건)', async () => {
    const { services, lines } = makeServices()
    services.reports.listPending.mockResolvedValue([
      {
        id: REPORT_ID,
        targetType: 'USER',
        targetId: USER_ID,
        reason: 'SPAM',
        reporterId: null,
        detail: '광고',
        createdAt: new Date('2026-10-15T00:00:00Z'),
      },
    ])
    await expect(runAdminCommand('reports:list', [], services)).resolves.toBe(0)
    expect(services.reports.listPending).toHaveBeenCalledWith(50)
    expect(lines[0]).toContain(REPORT_ID)
    expect(lines[0]).toContain('USER')
    expect(lines[0]).toContain('SPAM')
  })

  it('reports:list는 사용자 입력(detail)의 제어 문자(ANSI 이스케이프·개행·탭)를 지워 터미널 조작·줄 위조를 막는다', async () => {
    const { services, lines } = makeServices()
    services.reports.listPending.mockResolvedValue([
      {
        id: REPORT_ID,
        targetType: 'USER',
        targetId: USER_ID,
        reason: 'ETC',
        reporterId: USER_ID,
        detail: '\u001b[2J\u001b[31m가짜\r\n정지 완료: admin\tX\u0007\u009b‮',
        createdAt: new Date('2026-10-15T00:00:00Z'),
      },
    ])
    await runAdminCommand('reports:list', [], services)
    expect(lines).toHaveLength(1)
    const fields = lines[0]?.split('\t') ?? []
    expect(fields).toHaveLength(7)
    expect(fields[6]).toBe('[2J[31m가짜정지 완료: adminX')
  })

  it('실패 메시지도 제어 문자를 지우고 출력한다', async () => {
    const { services, lines } = makeServices()
    services.suspension.suspend.mockRejectedValue(new Error('없음\u001b[0m\n위조'))
    await runAdminCommand('users:suspend', [USER_ID], services)
    expect(lines).toEqual(['실패: 없음[0m위조'])
  })

  it('stripControlChars는 C0·C1·DEL·양방향 제어 문자만 지운다', () => {
    expect(stripControlChars('a\u0000b\u001fc\u007fd\u0085e⁦f⁩g 한글 ok')).toBe('abcdefg 한글 ok')
  })

  it('reports:list는 대기 신고가 없으면 안내 문구', async () => {
    const { services, lines } = makeServices()
    services.reports.listPending.mockResolvedValue([])
    await runAdminCommand('reports:list', ['10'], services)
    expect(services.reports.listPending).toHaveBeenCalledWith(10)
    expect(lines).toEqual(['대기 중인 신고가 없습니다'])
  })

  it('reports:resolve <id> hide|dismiss', async () => {
    const { services, lines } = makeServices()
    services.reports.resolve.mockResolvedValue({ updated: 3 })
    await expect(runAdminCommand('reports:resolve', [REPORT_ID, 'hide'], services)).resolves.toBe(0)
    expect(services.reports.resolve).toHaveBeenCalledWith(REPORT_ID, 'hide')
    expect(lines[0]).toContain('3')
  })

  it('reports:resolve 인자가 틀리면 1', async () => {
    const { services } = makeServices()
    await expect(runAdminCommand('reports:resolve', [REPORT_ID, 'delete'], services)).resolves.toBe(1)
    await expect(runAdminCommand('reports:resolve', [], services)).resolves.toBe(1)
    expect(services.reports.resolve).not.toHaveBeenCalled()
  })

  it('users:suspend <id>', async () => {
    const { services, lines } = makeServices()
    services.suspension.suspend.mockResolvedValue(undefined)
    await expect(runAdminCommand('users:suspend', [USER_ID], services)).resolves.toBe(0)
    expect(services.suspension.suspend).toHaveBeenCalledWith(USER_ID)
    expect(lines[0]).toContain(USER_ID)
    await expect(runAdminCommand('users:suspend', [], services)).resolves.toBe(1)
  })

  it('서비스 예외는 메시지를 출력하고 1', async () => {
    const { services, lines } = makeServices()
    services.suspension.suspend.mockRejectedValue(new Error('사용자 없음'))
    await expect(runAdminCommand('users:suspend', [USER_ID], services)).resolves.toBe(1)
    expect(lines.join('\n')).toContain('사용자 없음')
  })

  // reminders:run-now(Phase 2)는 reminders.command.spec.ts에서 검증한다
})
