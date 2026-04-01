import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { NewsContext } from './perplexity.provider';

@Injectable()
export class AnthropicProvider implements LlmProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = message.content[0];
      return block.type === 'text' ? block.text : '';
    } catch (error) {
      this.logger.error(`Anthropic API error: ${error}`);
      throw error;
    }
  }

  async fetchNewsWithSentiment(symbol: string): Promise<NewsContext | null> {
    const prompt = `${symbol}에 대한 최근 주요 뉴스 3건과 시장 감성을 분석해주세요.
다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{"articles": [{"title": "제목", "summary": "한줄 요약", "sentiment": "positive|negative|neutral"}], "overallSentiment": -100에서100사이숫자, "upcomingEvents": [{"date": "YYYY-MM-DD", "type": "earnings|dividend|split|fed", "description": "설명"}]}
사실만 전달하고 투자 조언은 하지 마세요. 학습된 지식을 기반으로 최근 알려진 뉴스와 예정된 이벤트를 제공하세요.`;

    try {
      const raw = await this.generate(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`Anthropic JSON parse failed for ${symbol}: no JSON found`);
        return { articles: [], overallSentiment: 0, upcomingEvents: [] };
      }
      return JSON.parse(jsonMatch[0]) as NewsContext;
    } catch (error) {
      this.logger.warn(`News sentiment fetch failed for ${symbol}: ${error}`);
      return null;
    }
  }
}
