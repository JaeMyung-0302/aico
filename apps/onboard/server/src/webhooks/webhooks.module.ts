import { Module } from '@nestjs/common'
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { WebhooksController } from './webhooks.controller'
import { WebhooksService } from './webhooks.service'

@Module({
  imports: [KnowledgeBaseModule, IntegrationsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
