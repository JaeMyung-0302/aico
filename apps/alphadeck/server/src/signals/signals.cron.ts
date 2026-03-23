import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SignalsService } from './signals.service';
import { NotificationService } from '../briefing/notification.service';
import type { DetectedSignal } from './signal-detector';

@Injectable()
export class SignalsCron {
  private readonly logger = new Logger(SignalsCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalsService: SignalsService,
    private readonly notificationService: NotificationService,
  ) {}

  // 미장 개장 시간 기준 5분 간격 (KST 22:30 ~ 05:00, 월~금)
  @Cron('*/5 22-23 * * 1-5')
  @Cron('*/5 0-5 * * 2-6')
  async checkSignals() {
    this.logger.log('Signal check started');

    try {
      const proMaxUsers = await this.prisma.user.findMany({
        where: { plan: { in: ['PRO', 'MAX'] } },
        select: { id: true },
      });

      for (const user of proMaxUsers) {
        try {
          const signals = await this.signalsService.checkSignalsForUser(user.id);

          if (signals.length === 0) continue;

          const signalsWithSymbol = signals as Array<DetectedSignal & { symbol: string }>;
          await this.signalsService.saveSignals(user.id, signalsWithSymbol);

          // 알림 발송
          const preferences = await this.signalsService.getPreferences(user.id);
          const enabledSymbols = new Set(
            preferences.filter((p) => p.enabled).map((p) => p.symbol),
          );

          const alertableSignals = signalsWithSymbol.filter(
            (s) => enabledSymbols.size === 0 || enabledSymbols.has(s.symbol),
          );

          if (alertableSignals.length > 0) {
            const subject = `시그널 알림: ${alertableSignals.map((s) => s.symbol).join(', ')}`;
            const html = this.buildAlertHtml(alertableSignals);
            await this.notificationService.notifyUser(user.id, subject, html);
          }
        } catch (error) {
          this.logger.warn(`Signal check failed for user ${user.id}: ${error}`);
        }
      }

      this.logger.log('Signal check completed');
    } catch (error) {
      this.logger.error(`Signal check batch failed: ${error}`);
    }
  }

  private buildAlertHtml(signals: Array<DetectedSignal & { symbol: string }>): string {
    const items = signals
      .map(
        (s) =>
          `<li><strong>${s.symbol}</strong> - ${s.message} (${s.direction === 'BULLISH' ? '📈' : s.direction === 'BEARISH' ? '📉' : '📊'})</li>`,
      )
      .join('');

    return `
      <h2>AlphaDesk 시그널 알림</h2>
      <ul>${items}</ul>
      <p style="color: #666; font-size: 12px;">
        본 알림은 기술적 지표 계산 결과이며, 투자 자문이 아닙니다.
      </p>
    `;
  }
}
