import { Module } from '@nestjs/common'
import { GeminiModule } from '../gemini/gemini.module'
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
  imports: [GeminiModule, KnowledgeBaseModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
