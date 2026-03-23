import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import { SyncProcessor } from '../knowledge-base/sync.processor'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly syncProcessor: SyncProcessor,
    private readonly prisma: PrismaService,
  ) {}

  verifyGitHubSignature = (payload: string, signature: string): boolean => {
    const secret = this.configService.get<string>('github.webhookSecret')
    if (!secret) {
      this.logger.warn('GITHUB_WEBHOOK_SECRET not configured')
      return false
    }

    const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  handleGitHubPush = async (payload: Record<string, unknown>) => {
    const repository = payload.repository as Record<string, unknown> | undefined
    if (!repository) return { processed: 0 }

    const fullName = repository.full_name
    if (typeof fullName !== 'string') return { processed: 0 }
    const [owner, repo] = fullName.split('/')
    if (!owner || !repo) return { processed: 0 }

    const integrations = await this.prisma.integration.findMany({
      where: {
        type: 'github',
        config: { path: ['owner'], equals: owner },
      },
    })

    const matchingIntegrations = integrations.filter((i) => {
      const config = i.config as Record<string, string>
      return config.repo === repo
    })

    for (const integration of matchingIntegrations) {
      this.syncProcessor.addJob({
        integrationId: integration.id,
        tenantId: integration.tenantId,
      })
      this.logger.log(`Re-sync queued for GitHub push: ${fullName}`)
    }

    return { processed: matchingIntegrations.length }
  }
}
