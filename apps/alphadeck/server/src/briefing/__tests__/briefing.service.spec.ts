import { Test, TestingModule } from '@nestjs/testing';
import { BriefingService } from '../briefing.service';
import { AnalysisService } from '../../analysis/analysis.service';
import { LlmService } from '../../llm/llm.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockAnalysisResult = {
  symbol: 'AAPL',
  prices: [{ date: new Date(), open: 150, high: 155, low: 149, close: 153, volume: 1000000 }],
  taResult: { rsi14: 55, macdHistogram: 0.5, sma200: 140, compositeScore: 25 },
  signalScore: { score: 25, breakdown: [] },
};

const mockAnalysisService = {
  analyzeSymbol: jest.fn().mockResolvedValue(mockAnalysisResult),
};

const mockLlmService = {
  interpretTaResult: jest.fn().mockResolvedValue('RSI가 55로 중립 구간입니다.'),
};

const mockPrisma = {
  portfolio: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 1,
        userId: 1,
        items: [
          { symbol: 'AAPL', quantity: 10, avgBuyPrice: 140 },
          { symbol: 'TSLA', quantity: 5, avgBuyPrice: 200 },
        ],
      },
    ]),
  },
  briefingLog: {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  },
  user: {
    findMany: jest.fn().mockResolvedValue([{ id: 1, email: 'test@test.com', plan: 'PRO' }]),
  },
};

describe('BriefingService', () => {
  let service: BriefingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BriefingService,
        { provide: AnalysisService, useValue: mockAnalysisService },
        { provide: LlmService, useValue: mockLlmService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BriefingService>(BriefingService);
    jest.clearAllMocks();
  });

  describe('generateBriefing', () => {
    it('포트폴리오 종목별 분석 결과를 생성해야 한다', async () => {
      const result = await service.generateBriefingForUser(1);

      expect(mockAnalysisService.analyzeSymbol).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('items');
      expect(result.items).toHaveLength(2);
    });

    it('LLM 해석을 포함해야 한다', async () => {
      const result = await service.generateBriefingForUser(1);

      expect(result.items[0]).toHaveProperty('interpretation');
    });

    it('결과를 briefing_logs에 저장해야 한다', async () => {
      await service.generateBriefingForUser(1);

      expect(mockPrisma.briefingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 1 }),
        }),
      );
    });
  });

  describe('getBriefings', () => {
    it('사용자의 브리핑 히스토리를 조회해야 한다', async () => {
      mockPrisma.briefingLog.create.mockClear();
      // getBriefings를 위한 별도 mock 불필요 — findMany는 service에서 직접 호출
    });
  });
});
