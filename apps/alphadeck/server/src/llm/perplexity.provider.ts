import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from './interfaces/llm-provider.interface';

@Injectable()
export class PerplexityProvider implements LlmProvider {
  private readonly logger = new Logger(PerplexityProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      this.logger.error(`Perplexity API error: ${error}`);
      throw error;
    }
  }

  async fetchNewsContext(symbol: string): Promise<string> {
    const prompt = `${symbol} 주식에 대한 최근 주요 뉴스와 시장 동향을 한국어로 3줄로 요약해주세요. 사실만 전달하고 투자 조언은 하지 마세요.`;

    try {
      return await this.generate(prompt);
    } catch (error) {
      this.logger.warn(`News fetch failed for ${symbol}: ${error}`);
      return '';
    }
  }
}
