import { Module } from '@nestjs/common'
import { IntegrationsController } from './integrations.controller'
import { IntegrationsService } from './integrations.service'
import { NotionProvider } from './providers/notion.provider'
import { GitHubProvider } from './providers/github.provider'

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, NotionProvider, GitHubProvider],
  exports: [IntegrationsService, NotionProvider, GitHubProvider],
})
export class IntegrationsModule {}
