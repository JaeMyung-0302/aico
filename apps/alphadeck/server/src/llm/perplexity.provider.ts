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

  async fetchNewsWithSentiment(symbol: string): Promise<NewsContext | null> {
    const prompt = `${symbol}에 대한 최근 주요 뉴스 3건과 시장 감성을 분석해주세요.
다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{"articles": [{"title": "제목", "summary": "한줄 요약", "sentiment": "positive|negative|neutral"}], "overallSentiment": -100에서100사이숫자, "upcomingEvents": [{"date": "YYYY-MM-DD", "type": "earnings|dividend|split|fed", "description": "설명"}]}
사실만 전달하고 투자 조언은 하지 마세요.`;

    try {
      const raw = await this.generate(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`Perplexity JSON parse failed for ${symbol}: no JSON found`);
        return { articles: [], overallSentiment: 0, upcomingEvents: [] };
      }
      return JSON.parse(jsonMatch[0]) as NewsContext;
    } catch (error) {
      this.logger.warn(`News sentiment fetch failed for ${symbol}: ${error}`);
      return null;
    }
  }
}

export interface NewsContext {
  articles: { title: string; summary: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
  overallSentiment: number;
  upcomingEvents: { date: string; type: string; description: string }[];
}
