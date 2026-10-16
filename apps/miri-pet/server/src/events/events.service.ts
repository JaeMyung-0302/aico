import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AnalyticsEvent } from '@miri-pet/shared'
import { PostHog } from 'posthog-node'
import type { AppConfig } from '../config/configuration'

export const POSTHOG_CLIENT = Symbol('POSTHOG_CLIENT')

// 쓰는 메서드만 좁힌다 → 테스트 대역이 쉽다
export type PosthogClient = Pick<PostHog, 'capture' | 'shutdown'>

type EventProperties = Record<string, string | number | boolean>

// 키가 없으면(개발·테스트) null → 아무것도 보내지 않는다
export const createPosthogClient = (config: ConfigService): PosthogClient | null => {
  const posthog = config.get<AppConfig['posthog']>('posthog')
  if (!posthog?.apiKey) return null
  return new PostHog(posthog.apiKey, { host: posthog.host })
}

// D11: 서버 발화 이벤트. distinctId는 내부 userId만 쓴다(이메일·닉네임 금지)
@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name)

  constructor(@Inject(POSTHOG_CLIENT) private readonly client: PosthogClient | null) {}

  capture(userId: string, event: AnalyticsEvent, properties?: EventProperties): void {
    if (!this.client) return
    try {
      this.client.capture({ distinctId: userId, event, ...(properties ? { properties } : {}) })
    } catch (error) {
      this.logger.warn(`[events] capture failed ${event}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown()
  }
}
