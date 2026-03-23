import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BriefingService } from './briefing.service';

@Injectable()
export class BriefingCron {
  private readonly logger = new Logger(BriefingCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly briefingService: BriefingService,
  ) {}

  // 매일 06:30 KST (21:30 UTC)
  @Cron('0 30 21 * * *')
  async generateDailyBriefings() {
    this.logger.log('Daily briefing generation started');

    try {
      const proUsers = await this.prisma.user.findMany({
        where: { plan: { in: ['PRO', 'MAX'] } },
        select: { id: true, email: true },
      });

      this.logger.log(`Generating briefings for ${proUsers.length} users`);

      const batchSize = 5;
      for (let i = 0; i < proUsers.length; i += batchSize) {
        const batch = proUsers.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((user) => this.briefingService.generateBriefingForUser(user.id)),
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          this.logger.warn(`${failures.length} briefings failed in batch ${i / batchSize + 1}`);
        }
      }

      this.logger.log('Daily briefing generation completed');
    } catch (error) {
      this.logger.error(`Daily briefing generation failed: ${error}`);
    }
  }
}
