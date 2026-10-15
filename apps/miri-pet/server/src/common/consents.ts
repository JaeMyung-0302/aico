import { type ConsentKind, REQUIRED_CONSENT_KINDS } from '@miri-pet/shared'
import type { PrismaService } from '../prisma/prisma.service'

type ConsentDelegate = Pick<PrismaService['consent'], 'findMany'>

const REQUIRED: readonly ConsentKind[] = REQUIRED_CONSENT_KINDS

// 필수 동의(철회되지 않은 것)를 모두 했는지. ConsentService(/me 응답)와 ConsentGuard가 같은 판정을 쓴다
// TODO(Phase 6): 약관 버전이 바뀌면 최신 버전 동의 여부로 판정
export const hasRequiredConsents = async (consents: ConsentDelegate, userId: string): Promise<boolean> => {
  const rows = await consents.findMany({
    where: { userId, kind: { in: [...REQUIRED] }, withdrawnAt: null },
    select: { kind: true },
    distinct: ['kind'],
  })
  const agreed = new Set<string>(rows.map((row) => row.kind))
  return REQUIRED.every((kind) => agreed.has(kind))
}
