import { Injectable } from '@nestjs/common'
import type { EventName, EventProps, TrackEventRequest } from '@you-in-heart/shared'
import { PrismaService } from '../prisma/prisma.service'

// 서버 서비스가 직접 기록하는 이벤트(클라이언트가 보내면 중복 집계) → POST /events는 거부
export const SERVER_ONLY_EVENT_NAMES: ReadonlySet<EventName> = new Set(['invite_created', 'couple_paired'])

// 지표용 EventLog. props는 shared 스키마가 본문·좌표·URL 키를 거부한 값만 받는다
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // 클라이언트 이벤트: coupleId는 요청 값이 아니라 CoupleMember에서 찾는다(미연결이면 null)
  async track(userId: string, { name, props }: TrackEventRequest): Promise<void> {
    const member = await this.prisma.coupleMember.findUnique({ where: { userId }, select: { coupleId: true } })
    await this.record(member?.coupleId ?? null, userId, name, props)
  }

  async record(coupleId: string | null, userId: string, name: EventName, props: EventProps = {}): Promise<void> {
    await this.prisma.eventLog.create({ data: { coupleId, userId, name, props } })
  }
}
