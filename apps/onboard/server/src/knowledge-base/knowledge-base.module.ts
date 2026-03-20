import { Module } from '@nestjs/common'
import { GeminiModule } from '../gemini/gemini.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { KnowledgeBaseController } from './knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base.service'
import { VectorSearchService } from './vector-search.service'
import { SyncProcessor } from './sync.processor'
import { PollingService } from './polling.service'

@Module({
  imports: [GeminiModule, IntegrationsModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, VectorSearchService, SyncProcessor, PollingService],
  exports: [KnowledgeBaseService, VectorSearchService, SyncProcessor],
})
export class KnowledgeBaseModule {}
