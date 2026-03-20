import { Controller, Post, Headers, Body, RawBody, HttpCode, Logger, UnauthorizedException } from '@nestjs/common'
import { WebhooksService } from './webhooks.service'

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name)

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  @HttpCode(200)
  async handleGitHubWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Body() body: Record<string, unknown>,
    @RawBody() rawBody: Buffer,
  ) {
    if (!signature) {
      this.logger.warn('GitHub webhook received without signature')
      throw new UnauthorizedException('Missing signature')
    }

    const isValid = this.webhooksService.verifyGitHubSignature(
      rawBody.toString('utf8'),
      signature,
    )
    if (!isValid) {
      this.logger.warn('GitHub webhook signature verification failed')
      throw new UnauthorizedException('Invalid signature')
    }

    if (event === 'push') {
      return this.webhooksService.handleGitHubPush(body)
    }

    return { event, status: 'ignored' }
  }
}
