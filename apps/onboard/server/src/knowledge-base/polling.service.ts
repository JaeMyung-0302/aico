import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { IntegrationsService } from '../integrations/integrations.service'
import { NotionProvider } from '../integrations/providers/notion.provider'
import { SyncProcessor } from './sync.processor'

@Injectable()
export class PollingService {
  private readonly logger = new Logger(PollingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
    private readonly notionProvider: NotionProvider,
    private readonly syncProcessor: SyncProcessor,
  ) {}

  @Cron('0 */15 * * * *')
  async handleNotionPolling() {
    const notionIntegrations = await this.prisma.integration.findMany({
      where: { type: 'notion' },
    })

    for (const integration of notionIntegrations) {
      try {
        const token = this.integrationsService.getDecryptedToken(integration.accessToken)
        const pages = await this.notionProvider.fetchPages(token)

        const documents = await this.prisma.document.findMany({
          where: { integrationId: integration.id },
          select: { externalId: true, lastSyncedAt: true },
        })

        const docMap = new Map(documents.map((d) => [d.externalId, d.lastSyncedAt]))

        const hasChanges = pages.some((page) => {
          const lastSynced = docMap.get(page.id)
          if (!lastSynced) return true
          return new Date(page.lastEditedTime) > lastSynced
        })

        if (hasChanges) {
          this.syncProcessor.addJob({
            integrationId: integration.id,
            tenantId: integration.tenantId,
          })
          this.logger.log(`Notion changes detected for integration ${integration.id}`)
        }
      } catch (error) {
        this.logger.error(`Notion polling failed for integration ${integration.id}`, error)
      }
    }
  }
}
