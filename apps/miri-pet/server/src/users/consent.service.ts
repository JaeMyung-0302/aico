import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common'
import {
  CONSENT_REQUIRED_KIND_CODE,
  type ConsentKind,
  consentKindSchema,
  CURRENT_CONSENT_VERSION,
  type MyConsent,
  OPTIONAL_CONSENT_KINDS,
  REQUIRED_CONSENT_KINDS,
} from '@miri-pet/shared'
import { hasRequiredConsents } from '../common/consents'
import { PrismaService } from '../prisma/prisma.service'

// 서버는 isAge14OrOlder=false도 받아서 422로 응답한다(공유 스키마는 literal(true) → 400이 되므로 확장)
export type ConsentSubmission = {
  isAge14OrOlder: boolean
  consents: ReadonlyArray<{ kind: ConsentKind; version: string }>
}

const REQUIRED: readonly ConsentKind[] = REQUIRED_CONSENT_KINDS
const OPTIONAL: readonly ConsentKind[] = OPTIONAL_CONSENT_KINDS
const KIND_ORDER: readonly ConsentKind[] = consentKindSchema.options

// 설정에서 바꿀 수 없는 kind: 필수(철회 = 회원 탈퇴), CERTIFICATE(/vaccinations/certificate-consent 전용)
const assertEditable = (kind: ConsentKind): void => {
  if (REQUIRED.includes(kind)) {
    throw new BadRequestException({
      code: CONSENT_REQUIRED_KIND_CODE,
      message: '필수 동의는 철회할 수 없어요. 철회하려면 회원 탈퇴를 해 주세요',
    })
  }
  if (!OPTIONAL.includes(kind)) {
    throw new BadRequestException({
      code: 'CONSENT_KIND_NOT_EDITABLE',
      message: '증명서 보관 동의는 접종 기록 화면에서 관리해요',
    })
  }
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, body: ConsentSubmission): Promise<void> {
    if (!body.isAge14OrOlder) throw new UnprocessableEntityException('만 14세 이상만 가입할 수 있어요')
    // 같은 kind가 여러 번 오면 마지막 값만 쓴다
    const byKind = new Map(body.consents.map((consent) => [consent.kind, consent.version]))
    const missing = REQUIRED.filter((kind) => !byKind.has(kind))
    if (missing.length > 0) throw new UnprocessableEntityException(`필수 동의가 필요해요: ${missing.join(', ')}`)

    await this.prisma.$transaction([
      this.prisma.consent.createMany({
        data: [...byKind].map(([kind, version]) => ({ userId, kind, version })),
      }),
      this.prisma.user.update({ where: { id: userId }, data: { birthYearVerifiedAt: new Date() } }),
    ])
  }

  // kind별 가장 최근 동의 행 = 현재 상태 (철회 후 다시 동의하면 새 행이 생긴다)
  async list(userId: string): Promise<MyConsent[]> {
    const rows = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: [{ agreedAt: 'desc' }, { id: 'desc' }],
      distinct: ['kind'],
      select: { kind: true, version: true, agreedAt: true, withdrawnAt: true },
    })
    return [...rows]
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
      .map((row) => ({
        kind: row.kind,
        version: row.version,
        agreedAt: row.agreedAt.toISOString(),
        withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
      }))
  }

  // 선택 동의(LOCATION·MARKETING)만: 동의 → 유효한 행이 없을 때 현재 버전으로 새 행, 철회 → 유효한 행에 withdrawnAt
  async update(userId: string, kind: ConsentKind, isAgreed: boolean): Promise<MyConsent[]> {
    assertEditable(kind)
    if (isAgreed) {
      const active = await this.prisma.consent.findFirst({
        where: { userId, kind, withdrawnAt: null },
        select: { id: true },
      })
      if (!active) await this.prisma.consent.create({ data: { userId, kind, version: CURRENT_CONSENT_VERSION } })
    } else {
      await this.prisma.consent.updateMany({
        where: { userId, kind, withdrawnAt: null },
        data: { withdrawnAt: new Date() },
      })
    }
    return this.list(userId)
  }

  hasRequiredConsents(userId: string): Promise<boolean> {
    return hasRequiredConsents(this.prisma.consent, userId)
  }
}
