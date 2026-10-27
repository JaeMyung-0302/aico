import type { INestApplication } from '@nestjs/common'
import type { Couple, PrismaClient } from '../../src/generated/prisma'
import { tokenFor } from './auth-helpers'
import { createPairedCouple, grantRequiredConsents, type PairedCouple } from './factories'

export type CoupleSession = PairedCouple & { tokens: [string, string] }

// 필수 동의를 마친 커플 + 두 멤버의 access token(커플 라우트 통합 테스트 공용)
export const createCoupleSession = async (
  app: INestApplication,
  prisma: PrismaClient,
  overrides: Partial<Pick<Couple, 'status' | 'startedOn' | 'purgeAfter'>> = {},
): Promise<CoupleSession> => {
  const paired = await createPairedCouple(prisma, overrides)
  await grantRequiredConsents(
    prisma,
    paired.members.map((member) => member.id),
  )
  const tokens: [string, string] = [
    await tokenFor(app, paired.members[0].id),
    await tokenFor(app, paired.members[1].id),
  ]
  return { ...paired, tokens }
}
