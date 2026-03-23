import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
  ) {}

  async notifyUser(
    userId: number,
    subject: string,
    htmlContent: string,
  ): Promise<{ email: boolean; push: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, pushSubscription: true },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found for notification`);
      return { email: false, push: false };
    }

    const results = { email: false, push: false };

    try {
      await this.emailService.sendBriefingEmail(user.email, subject, htmlContent);
      results.email = true;
    } catch (error) {
      this.logger.warn(`Email notification failed for user ${userId}: ${error}`);
    }

    if (user.pushSubscription) {
      try {
        const subscription = JSON.parse(user.pushSubscription as string);
        const pushPayload = JSON.stringify({
          title: 'AlphaDesk 브리핑',
          body: subject,
          url: '/briefing',
        });
        results.push = await this.pushService.sendPush(subscription, pushPayload);
      } catch (error) {
        this.logger.warn(`Push notification failed for user ${userId}: ${error}`);
      }
    }

    return results;
  }
}
