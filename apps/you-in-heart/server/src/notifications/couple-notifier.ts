import { Injectable } from '@nestjs/common'
import { EventsService } from '../events/events.service'
import type { NotificationLogKind } from '../generated/prisma'
import { type PushNotice, PushService } from './push.service'

// 커플 알림 공통 경로: 푸시 발송 + 수신자마다 notification_sent 이벤트 1건(지표).
// title·body에 일기 본문·날짜·좌표를 넣지 않고 data에는 type과 id만 담는다(잠금 화면 노출)
@Injectable()
export class CoupleNotifier {
  constructor(
    private readonly push: PushService,
    private readonly events: EventsService,
  ) {}

  async notify(coupleId: string, kind: NotificationLogKind, notices: readonly PushNotice[]): Promise<void> {
    if (notices.length === 0) return
    await this.push.sendToUsers(notices)
    await Promise.all(
      notices.map((notice) => this.events.record(coupleId, notice.userId, 'notification_sent', { kind })),
    )
  }
}
