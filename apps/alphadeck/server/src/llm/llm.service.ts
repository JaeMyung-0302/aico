import { Inject, Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { buildTaInterpretationPrompt } from './prompts/ta-interpretation.prompt';
import { FORBIDDEN_KEYWORDS } from './prompts/regulatory-guard.prompt';
import { TaResultData } from '../ta-engine/ta-engine.service';
import { SignalScore } from '../ta-engine/interfaces/signal-score.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    @Inject('GEMINI_PROVIDER')
    private readonly gemini: LlmProvider,
  ) {}

  async interpretTaResult(
    symbol: string,
    currentPrice: number,
    taResult: TaResultData,
    signalScore: SignalScore,
  ): Promise<string> {
    const prompt = buildTaInterpretationPrompt(
      symbol,
      currentPrice,
      taResult,
      signalScore,
    );

    try {
      const raw = await this.gemini.generate(prompt);
      return this.filterForbiddenKeywords(raw);
    } catch (error) {
      this.logger.warn(`LLM interpretation failed for ${symbol}: ${error}`);
      return `AI 해석을 일시적으로 제공할 수 없습니다. 위의 기술적 지표 수치를 직접 참고해주세요. (복합 시그널 스코어: ${signalScore.score})`;
    }
  }

  private filterForbiddenKeywords(text: string): string {
    let filtered = text;
    for (const keyword of FORBIDDEN_KEYWORDS) {
      if (filtered.includes(keyword)) {
        this.logger.warn(`Forbidden keyword detected and removed: "${keyword}"`);
        filtered = filtered.replaceAll(keyword, '[필터됨]');
      }
    }
    return filtered;
  }
}
