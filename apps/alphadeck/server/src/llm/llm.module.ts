import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    LlmService,
    {
      provide: 'GEMINI_PROVIDER',
      useFactory: (config: ConfigService) => {
        // Anthropic이 있으면 Anthropic 사용, 없으면 Gemini fallback
        const anthropicKey = config.get<string>('anthropic.apiKey', '');
        if (anthropicKey) {
          return new AnthropicProvider(anthropicKey);
        }
        const geminiKey = config.get<string>('gemini.apiKey', '');
        return new GeminiProvider(geminiKey);
      },
      inject: [ConfigService],
    },
    {
      provide: 'ANTHROPIC_NEWS_PROVIDER',
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('anthropic.apiKey', '');
        return new AnthropicProvider(apiKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LlmService, 'ANTHROPIC_NEWS_PROVIDER'],
})
export class LlmModule {}
