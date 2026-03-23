import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendBriefingEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured, skipping email');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@alphadeck.app'),
        to,
        subject,
        html,
      });
      this.logger.log(`Briefing email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Email send failed for ${to}: ${error}`);
    }
  }
}
