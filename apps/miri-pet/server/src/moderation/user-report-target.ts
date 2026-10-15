import { USER_NOT_FOUND_MESSAGE, VISIBLE_USER_WHERE } from '../common/visible-user'
import type { PrismaService } from '../prisma/prisma.service'
import type { ReportTargetHandler } from './report.service'

type UserDelegate = Pick<PrismaService['user'], 'findFirst' | 'updateMany'>

// USER 신고: 자격 있는 신고 3명 누적 시 프로필 숨김(hiddenAt). 대상은 /users/:id에 보이는 사용자만(그 외 같은 404)
export const createUserReportTarget = (users: UserDelegate): ReportTargetHandler => ({
  notFoundMessage: USER_NOT_FOUND_MESSAGE,
  findOwnerId: async (targetId) => {
    const user = await users.findFirst({ where: { id: targetId, ...VISIBLE_USER_WHERE }, select: { id: true } })
    return user?.id ?? null
  },
  // 운영자(ADMIN)는 신고 누적으로 숨기지 않는다. 이미 숨겨졌거나 ADMIN이면 false
  hide: async (targetId) => {
    const { count } = await users.updateMany({
      where: { id: targetId, hiddenAt: null, role: { not: 'ADMIN' } },
      data: { hiddenAt: new Date() },
    })
    return count > 0
  },
  unhide: async (targetId) => {
    await users.updateMany({ where: { id: targetId }, data: { hiddenAt: null } })
  },
})
