import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';
import { GeminiProvider } from './gemini.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    LlmService,
    {
      provide: 'GEMINI_PROVIDER',
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('gemini.apiKey', '');
        return new GeminiProvider(apiKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
