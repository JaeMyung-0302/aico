import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Expo } from 'expo-server-sdk'
import type { PushMessage, PushReceipt, PushSender, PushTicket } from './push.service'

// expo-server-sdk는 ESM 전용 → 실제 발송 때만 불러온다(Node 22 require(esm)). 테스트는 PUSH_SENDER를 대역으로 바꾼다
@Injectable()
export class ExpoPushSender implements PushSender {
  private clientPromise: Promise<Expo> | null = null

  constructor(private readonly config: ConfigService) {}

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    const expo = await this.client()
    let tickets: readonly PushTicket[] = []
    for (const chunk of expo.chunkPushNotifications(messages)) {
      // 청크는 순서대로 보내 티켓 순서를 메시지 순서와 맞춘다
      tickets = [...tickets, ...(await expo.sendPushNotificationsAsync(chunk))]
    }
    return [...tickets]
  }

  async getReceipts(ids: string[]): Promise<Record<string, PushReceipt>> {
    const expo = await this.client()
    const results = await Promise.all(
      expo.chunkPushNotificationReceiptIds(ids).map((chunk) => expo.getPushNotificationReceiptsAsync(chunk)),
    )
    return Object.assign({}, ...results)
  }

  private client(): Promise<Expo> {
    const accessToken = this.config.get<string>('expoAccessToken') || undefined
    this.clientPromise ??= import('expo-server-sdk').then((sdk) => new sdk.Expo({ accessToken }))
    return this.clientPromise
  }
}
