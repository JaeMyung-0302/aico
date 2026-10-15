import { remindersRunCommand, runRemindersNow } from './reminders.command'

// AdminServices(다른 Phase와 공유)에 의존하지 않도록 print만 받는 실행 함수를 검증한다
const collectLines = () => {
  const lines: string[] = []
  return { lines, print: (line: string) => void lines.push(line) }
}

describe('reminders:run-now', () => {
  it('등록 이름은 reminders:run-now', () => {
    expect(remindersRunCommand.name).toBe('reminders:run-now')
  })

  it('리마인더를 1회 실행하고 결과를 출력한 뒤 컨텍스트를 닫는다 (exit 0)', async () => {
    const runOnce = jest.fn().mockResolvedValue({ today: '2026-10-13', candidates: 3, sent: 2, skipped: 1 })
    const close = jest.fn().mockResolvedValue(undefined)
    const { lines, print } = collectLines()

    await expect(runRemindersNow(async () => ({ runner: { runOnce }, close }), print)).resolves.toBe(0)

    expect(runOnce).toHaveBeenCalledTimes(1)
    expect(lines).toEqual(['KST 2026-10-13: 대상 3건, 발송 2건, 이미 보냄 1건'])
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('실행이 실패해도 컨텍스트는 닫고 예외를 올린다 (runAdminCommand가 exit 1로 바꾼다)', async () => {
    const close = jest.fn().mockResolvedValue(undefined)
    const open = async () => ({ runner: { runOnce: jest.fn().mockRejectedValue(new Error('db down')) }, close })
    await expect(runRemindersNow(open, collectLines().print)).rejects.toThrow('db down')
    expect(close).toHaveBeenCalledTimes(1)
  })
})
