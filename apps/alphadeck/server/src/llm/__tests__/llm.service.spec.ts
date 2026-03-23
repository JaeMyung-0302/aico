import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm.service';
import { FORBIDDEN_KEYWORDS } from '../prompts/regulatory-guard.prompt';
import { TaResultData } from '../../ta-engine/ta-engine.service';
import { SignalScore } from '../../ta-engine/interfaces/signal-score.interface';

const mockGeminiProvider = {
  generate: jest.fn().mockResolvedValue(
    'RSI 14가 45로 중립 구간에 위치하고 있습니다. MACD 히스토그램이 양수를 나타내고 있어 단기 모멘텀이 상승 방향으로 전환되고 있는 모습입니다. 볼린저밴드 중심선 위에 위치하고 있으며, 거래량은 평균 수준입니다. 기술적 지표상 현재 완만한 상승 추세를 보이고 있습니다.',
  ),
};

const sampleTaResult: TaResultData = {
  sma20: 150,
  sma200: 140,
  rsi14: 45,
  macdLine: 1,
  macdSignal: 0.5,
  macdHistogram: 0.5,
  bbUpper: 160,
  bbMiddle: 150,
  bbLower: 140,
  volumeRatio: 1.1,
};

const sampleSignalScore: SignalScore = {
  score: 25,
  breakdown: [
    { name: 'RSI', value: 12.5, direction: 'NEUTRAL', weight: 0.25 },
    { name: 'MACD', value: 10, direction: 'NEUTRAL', weight: 0.25 },
    { name: 'BollingerBands', value: 0, direction: 'NEUTRAL', weight: 0.2 },
    { name: 'SMA', value: 35.7, direction: 'BUY', weight: 0.15 },
    { name: 'Volume', value: 5, direction: 'NEUTRAL', weight: 0.15 },
  ],
};

describe('LlmService', () => {
  let service: LlmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        { provide: 'GEMINI_PROVIDER', useValue: mockGeminiProvider },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    jest.clearAllMocks();
  });

  describe('interpretTaResult', () => {
    it('한국어 해석을 반환해야 한다', async () => {
      const result = await service.interpretTaResult('AAPL', 152, sampleTaResult, sampleSignalScore);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('Gemini provider를 호출해야 한다', async () => {
      await service.interpretTaResult('AAPL', 152, sampleTaResult, sampleSignalScore);

      expect(mockGeminiProvider.generate).toHaveBeenCalledTimes(1);
      const prompt = mockGeminiProvider.generate.mock.calls[0][0];
      expect(prompt).toContain('AAPL');
      expect(prompt).toContain('RSI');
    });
  });

  describe('금지 키워드 필터', () => {
    it('금지 키워드가 포함된 응답을 필터링해야 한다', async () => {
      mockGeminiProvider.generate.mockResolvedValueOnce(
        'RSI가 낮으므로 매수하세요. 지금이 기회입니다.',
      );

      const result = await service.interpretTaResult('AAPL', 152, sampleTaResult, sampleSignalScore);

      for (const keyword of FORBIDDEN_KEYWORDS) {
        expect(result).not.toContain(keyword);
      }
    });

    it('정상 응답은 그대로 반환해야 한다', async () => {
      const normalResponse = 'RSI가 45로 중립 구간에 위치하고 있습니다.';
      mockGeminiProvider.generate.mockResolvedValueOnce(normalResponse);

      const result = await service.interpretTaResult('AAPL', 152, sampleTaResult, sampleSignalScore);

      expect(result).toBe(normalResponse);
    });
  });

  describe('Gemini 실패 시 fallback', () => {
    it('LLM 실패 시 기본 메시지를 반환해야 한다', async () => {
      mockGeminiProvider.generate.mockRejectedValueOnce(new Error('API error'));

      const result = await service.interpretTaResult('AAPL', 152, sampleTaResult, sampleSignalScore);

      expect(result).toContain('AI 해석을 일시적으로 제공할 수 없습니다');
    });
  });
});
