import { Inject, Injectable, Logger } from '@nestjs/common'
import type { RegisterPushTokenRequest } from '@miri-pet/shared'
import { PrismaService } from '../prisma/prisma.service'

// Expo Push 연동은 이 인터페이스 뒤에 둔다 → 테스트는 대역으로 바꿔 네트워크를 타지 않는다
export const PUSH_SENDER = Symbol('PUSH_SENDER')

export type PushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound: 'default'
}

type PushErrorDetails = { error?: string }
export type PushTicket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: PushErrorDetails }
export type PushReceipt = { status: 'ok' } | { status: 'error'; message: string; details?: PushErrorDetails }

export type PushSender = {
  // 메시지 순서대로 티켓을 돌려준다(청크 분할은 구현체 책임)
  send: (messages: PushMessage[]) => Promise<PushTicket[]>
  getReceipts: (ids: string[]) => Promise<Record<string, PushReceipt>>
}

export type PushNotice = { userId: string; title: string; body: string; data?: Record<string, string> }

const isDeviceGone = (result: PushTicket | PushReceipt): boolean =>
  result.status === 'error' && result.details?.error === 'DeviceNotRegistered'

const PLATFORM = { ios: 'IOS', android: 'ANDROID' } as const

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)
  // receiptId → expoToken. 단일 인스턴스라 메모리로 충분(재시작 시 유실되면 다음 발송 티켓에서 다시 걸러진다)
  private pendingReceipts: ReadonlyMap<string, string> = new Map()

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  async sendToUsers(notices: readonly PushNotice[]): Promise<{ sent: number }> {
    if (notices.length === 0) return { sent: 0 }
    const userIds = [...new Set(notices.map((notice) => notice.userId))]
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, expoToken: true },
    })
    const messages: PushMessage[] = notices.flatMap(({ userId, title, body, data }) =>
      tokens
        .filter((token) => token.userId === userId)
        .map((token) => ({ to: token.expoToken, title, body, ...(data ? { data } : {}), sound: 'default' as const })),
    )
    if (messages.length === 0) return { sent: 0 }

    try {
      const tickets = await this.sender.send(messages)
      return { sent: await this.applyTickets(messages, tickets) }
    } catch (error) {
      this.logger.error(`[push] send failed (${messages.length}건)`, error instanceof Error ? error.stack : error)
      return { sent: 0 }
    }
  }

  // 15분 주기(push-receipt.cron): 확정된 receipt만 처리하고 아직 안 나온 건 다음 주기로 남긴다
  async checkReceipts(): Promise<{ checked: number; removedTokens: number }> {
    const ids = [...this.pendingReceipts.keys()]
    if (ids.length === 0) return { checked: 0, removedTokens: 0 }
    const receipts = await this.sender.getReceipts(ids)
    const settledIds = ids.filter((id) => receipts[id] !== undefined)
    const goneTokens = settledIds.flatMap((id) => {
      const receipt = receipts[id]
      const token = this.pendingReceipts.get(id)
      return receipt && token && isDeviceGone(receipt) ? [token] : []
    })
    this.pendingReceipts = new Map([...this.pendingReceipts].filter(([id]) => !settledIds.includes(id)))
    await this.removeTokens(goneTokens)
    return { checked: settledIds.length, removedTokens: goneTokens.length }
  }

  // 같은 기기를 다른 계정이 쓰게 되면 소유자를 옮긴다(expoToken unique).
  // 보안 리뷰 L1(수용): Expo 토큰은 기기 소유 증명이 아니라서, 남의 토큰을 아는 사람이 로그인한 채 등록하면 그 기기 알림을
  // 자기 계정으로 가져올 수 있다. 등록은 인증된 세션에서만 가능하고(@Authenticated), 재할당은 로그로 남겨 운영자가 추적한다
  async registerToken(userId: string, { expoToken, platform }: RegisterPushTokenRequest): Promise<void> {
    const existing = await this.prisma.pushToken.findUnique({ where: { expoToken }, select: { userId: true } })
    if (existing && existing.userId !== userId) {
      this.logger.warn(`[push] token reassigned from ${existing.userId} to ${userId}`)
    }
    await this.prisma.pushToken.upsert({
      where: { expoToken },
      create: { userId, expoToken, platform: PLATFORM[platform] },
      update: { userId, platform: PLATFORM[platform], lastSeenAt: new Date() },
    })
  }

  async removeToken(userId: string, expoToken: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, expoToken } })
  }

  private async applyTickets(messages: readonly PushMessage[], tickets: readonly PushTicket[]): Promise<number> {
    const okEntries = tickets.flatMap((ticket, index) => {
      const token = messages[index]?.to
      return ticket.status === 'ok' && token ? [[ticket.id, token] as const] : []
    })
    const goneTokens = tickets.flatMap((ticket, index) => {
      const token = messages[index]?.to
      return isDeviceGone(ticket) && token ? [token] : []
    })
    this.pendingReceipts = new Map([...this.pendingReceipts, ...okEntries])
    await this.removeTokens(goneTokens)
    return okEntries.length
  }

  private async removeTokens(expoTokens: readonly string[]): Promise<void> {
    if (expoTokens.length === 0) return
    this.logger.warn(`[push] DeviceNotRegistered 토큰 ${expoTokens.length}개 삭제`)
    await this.prisma.pushToken.deleteMany({ where: { expoToken: { in: [...expoTokens] } } })
  }
}
