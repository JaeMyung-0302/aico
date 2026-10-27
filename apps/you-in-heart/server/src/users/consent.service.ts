import { Injectable } from '@nestjs/common'
import type { Consents, PutConsentsRequest } from '@you-in-heart/shared'
import type { ConsentKind, Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

// 현재 약관·개인정보·위치 동의 문서 버전. 문서가 바뀌면 올린다
// TODO(출시 전): 버전이 바뀌면 최신 버전 동의 여부로 판정하고 재동의를 받는다
export const CURRENT_CONSENT_VERSION = '2026-10-27'

type ConsentDelegate = Prisma.TransactionClient['consent']

const readStatus = async (consents: ConsentDelegate, userId: string): Promise<Consents> => {
  const rows = await consents.findMany({
    where: { userId, withdrawnAt: null },
    select: { kind: true },
    distinct: ['kind'],
  })
  const agreed = new Set<ConsentKind>(rows.map((row) => row.kind))
  return { terms: agreed.has('TERMS'), privacy: agreed.has('PRIVACY'), location: agreed.has('LOCATION') }
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  // 철회되지 않은 동의 행 = 현재 동의
  status(userId: string): Promise<Consents> {
    return readStatus(this.prisma.consent, userId)
  }

  // 커플 라우트 게이트(CoupleGuard): 약관·개인정보 모두 유효한 동의
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const { terms, privacy } = await this.status(userId)
    return terms && privacy
  }

  // 좌표 저장·조회(@RequiresLocationConsent): 철회되지 않은 위치 동의
  async hasLocationConsent(userId: string): Promise<boolean> {
    return (await this.status(userId)).location
  }

  // 전체 상태를 받는다. TERMS·PRIVACY는 스키마가 true만 허용. 동의는 없는 kind만 새 행(이력 보존), 위치 끄기는 철회 기록
  put(userId: string, body: PutConsentsRequest): Promise<Consents> {
    const wanted: readonly ConsentKind[] = body.location ? ['TERMS', 'PRIVACY', 'LOCATION'] : ['TERMS', 'PRIVACY']
    return this.prisma.$transaction(async (tx) => {
      const current = await readStatus(tx.consent, userId)
      const isAgreed: Record<ConsentKind, boolean> = {
        TERMS: current.terms,
        PRIVACY: current.privacy,
        LOCATION: current.location,
      }
      const missing = wanted.filter((kind) => !isAgreed[kind])
      if (missing.length > 0) {
        await tx.consent.createMany({
          data: missing.map((kind) => ({ userId, kind, version: CURRENT_CONSENT_VERSION })),
        })
      }
      if (!body.location && current.location) {
        await tx.consent.updateMany({
          where: { userId, kind: 'LOCATION', withdrawnAt: null },
          data: { withdrawnAt: new Date() },
        })
      }
      return readStatus(tx.consent, userId)
    })
  }
}
