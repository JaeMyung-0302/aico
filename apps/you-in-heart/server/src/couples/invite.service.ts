import { randomInt } from 'node:crypto'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  type Couple,
  type CreateInviteResponse,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_HOURS,
} from '@you-in-heart/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { EventsService } from '../events/events.service'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { CouplesService } from './couples.service'

const HOUR_MS = 3_600_000
// 코드 충돌(unique)은 32^6 공간에서 드물다. 그래도 나면 트랜잭션째 다시 시도
const MAX_CODE_ATTEMPTS = 3

type LockedInvite = { id: string; creatorId: string; expiresAt: Date; usedAt: Date | null; revokedAt: Date | null }

// 만료·사용됨·자기 코드·이미 소속·없음을 구분하지 않는다(존재 여부 비노출)
export const inviteNotFound = () => new NotFoundException({ message: '코드를 확인해 주세요' })

export const generateInviteCode = (): string =>
  Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]).join(
    '',
  )

const isUsable = (invite: LockedInvite, joinerId: string, now: Date): boolean =>
  invite.usedAt === null && invite.revokedAt === null && invite.expiresAt > now && invite.creatorId !== joinerId

const revokeActiveInvites = (tx: Prisma.TransactionClient, creatorIds: string[], now: Date) =>
  tx.coupleInvite.updateMany({
    where: { creatorId: { in: creatorIds }, usedAt: null, revokedAt: null },
    data: { revokedAt: now },
  })

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couples: CouplesService,
    private readonly events: EventsService,
  ) {}

  // 미소속 사용자만. 사용자당 활성 코드 1개(재발급 시 이전 코드 무효)
  async createInvite(userId: string, attempt = 1): Promise<CreateInviteResponse> {
    try {
      const invite = await this.prisma.$transaction(async (tx) => {
        // 같은 사용자의 동시 발급이 활성 코드 2개를 만들지 않도록 사용자 행을 잠근다
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`
        const member = await tx.coupleMember.findUnique({ where: { userId }, select: { id: true } })
        if (member) throw new ConflictException('이미 연결된 커플이 있어요')
        const now = new Date()
        await revokeActiveInvites(tx, [userId], now)
        return tx.coupleInvite.create({
          data: {
            creatorId: userId,
            code: generateInviteCode(),
            expiresAt: new Date(now.getTime() + INVITE_TTL_HOURS * HOUR_MS),
          },
          select: { code: true, expiresAt: true },
        })
      })
      await this.events.record(null, userId, 'invite_created')
      return { code: invite.code, expiresAt: invite.expiresAt.toISOString() }
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_CODE_ATTEMPTS) return this.createInvite(userId, attempt + 1)
      throw error
    }
  }

  // invite 행을 FOR UPDATE로 잠가 같은 코드의 동시 join 중 1명만 통과. 1인 1커플은 CoupleMember.userId unique가 최종 보장
  async join(userId: string, code: string): Promise<Couple> {
    const coupleId = await this.prisma
      .$transaction(async (tx) => {
        const [invite] = await tx.$queryRaw<LockedInvite[]>`
          SELECT id, "creatorId", "expiresAt", "usedAt", "revokedAt" FROM "CoupleInvite" WHERE code = ${code} FOR UPDATE`
        const now = new Date()
        if (!invite || !isUsable(invite, userId, now)) throw inviteNotFound()
        const userIds = [invite.creatorId, userId]
        if ((await tx.coupleMember.count({ where: { userId: { in: userIds } } })) > 0) throw inviteNotFound()
        const couple = await tx.couple.create({
          data: {
            members: {
              create: [
                { userId: invite.creatorId, slot: 1 },
                { userId, slot: 2 },
              ],
            },
          },
          select: { id: true },
        })
        await tx.coupleInvite.update({ where: { id: invite.id }, data: { usedAt: now } })
        await revokeActiveInvites(tx, userIds, now)
        return couple.id
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? inviteNotFound() : error
      })
    await this.events.record(coupleId, userId, 'couple_paired')
    return this.couples.getCouple(coupleId)
  }
}
