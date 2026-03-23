import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private isConfigured = false;

  constructor(private readonly config: ConfigService) {
    const vapidPublic = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivate = this.config.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail = this.config.get<string>('VAPID_EMAIL', 'mailto:admin@alphadeck.app');

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
      this.isConfigured = true;
    } else {
      this.logger.warn('VAPID keys not configured, push notifications disabled');
    }
  }

  async sendPush(subscription: PushSubscription, payload: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('Push not configured, skipping');
      return false;
    }

    try {
      await webpush.sendNotification(subscription, payload);
      return true;
    } catch (error: any) {
      if (error.statusCode === 410) {
        this.logger.log('Subscription expired, should be removed');
        return false;
      }
      this.logger.error(`Push send failed: ${error}`);
      return false;
    }
  }

  getVapidPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }
}
