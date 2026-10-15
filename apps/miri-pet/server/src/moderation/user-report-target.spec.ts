import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { createUserReportTarget } from './user-report-target'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000b1'

describe('USER 신고 대상 핸들러', () => {
  let prisma: FakePrisma
  let handler: ReturnType<typeof createUserReportTarget>

  beforeEach(() => {
    prisma = createFakePrisma()
    handler = createUserReportTarget(prisma.user)
  })

  it('ACTIVE이고 숨겨지지 않은 사용자만 신고 대상(그 외는 /users/:id와 같은 404 → 존재 여부 비노출)', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: USER_ID })
    await expect(handler.findOwnerId(USER_ID)).resolves.toBe(USER_ID)
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: USER_ID, status: 'ACTIVE', hiddenAt: null },
      select: { id: true },
    })
  })

  it('없으면 null', async () => {
    prisma.user.findFirst.mockResolvedValue(null)
    await expect(handler.findOwnerId(USER_ID)).resolves.toBeNull()
  })

  it('hide는 ADMIN이 아닌 사용자의 hiddenAt을 설정하고(새로 숨겼으면 true) unhide는 지운다', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 })
    await expect(handler.hide(USER_ID)).resolves.toBe(true)
    expect(prisma.user.updateMany).toHaveBeenLastCalledWith({
      where: { id: USER_ID, hiddenAt: null, role: { not: 'ADMIN' } },
      data: { hiddenAt: expect.any(Date) },
    })
    await handler.unhide(USER_ID)
    expect(prisma.user.updateMany).toHaveBeenLastCalledWith({ where: { id: USER_ID }, data: { hiddenAt: null } })
  })

  it('ADMIN이거나 이미 숨겨졌으면 갱신 0건 → false', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 })
    await expect(handler.hide(USER_ID)).resolves.toBe(false)
  })
})
