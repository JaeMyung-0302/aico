import { ReviewEngine } from '../review-engine';
import { PatternDetector, type DetectedPattern } from '../pattern-detector';

describe('ReviewEngine', () => {
  const engine = new ReviewEngine();

  const makeTrade = (overrides: Partial<any> = {}) => ({
    id: 1,
    symbol: 'AAPL',
    action: 'BUY',
    quantity: 10,
    price: 150,
    tradedAt: new Date('2026-01-15'),
    taSnapshot: null,
    ...overrides,
  });

  it('과매수 구간 매수를 RISKY로 판정', () => {
    const trades = [makeTrade({ taSnapshot: { rsi14: 75 } })];
    const results = engine.analyzeTrades(trades);

    expect(results[0]?.result).toContain('RISKY');
    expect(results[0]?.result).toContain('과매수');
  });

  it('과매도 구간 매수를 GOOD으로 판정', () => {
    const trades = [makeTrade({ taSnapshot: { rsi14: 25 } })];
    const results = engine.analyzeTrades(trades);

    expect(results[0]?.result).toContain('GOOD');
  });

  it('공포 매도를 RISKY로 판정', () => {
    const trades = [makeTrade({ action: 'SELL', taSnapshot: { rsi14: 22 } })];
    const results = engine.analyzeTrades(trades);

    expect(results[0]?.result).toContain('RISKY');
    expect(results[0]?.result).toContain('공포 매도');
  });

  it('TA 스냅샷 없으면 NEUTRAL 반환', () => {
    const trades = [makeTrade()];
    const results = engine.analyzeTrades(trades);

    expect(results[0]?.result).toContain('NEUTRAL');
  });

  it('hindsight 생성', () => {
    const trades = [makeTrade({ taSnapshot: { rsi14: 72, macdHistogram: -0.5 } })];
    const results = engine.analyzeTrades(trades);

    expect(results[0]?.hindsight).toBeTruthy();
    expect(results[0]?.hindsight.length).toBeGreaterThan(0);
  });
});

describe('PatternDetector', () => {
  const detector = new PatternDetector();

  const makeTrade = (overrides: Partial<any> = {}) => ({
    id: 1,
    symbol: 'AAPL',
    action: 'BUY',
    quantity: 10,
    price: 150,
    tradedAt: new Date('2026-01-15'),
    taSnapshot: null,
    ...overrides,
  });

  it('과매수 추격매수 패턴 감지 (2회+)', () => {
    const trades = [
      makeTrade({ id: 1, taSnapshot: { rsi14: 75 } }),
      makeTrade({ id: 2, taSnapshot: { rsi14: 80 } }),
      makeTrade({ id: 3, taSnapshot: { rsi14: 50 } }),
    ];

    const patterns = detector.detectPatterns(trades);
    const pattern = patterns.find((p) => p.name === '과매수 추격매수');

    expect(pattern).toBeDefined();
    expect(pattern?.count).toBe(2);
  });

  it('공포 매도 패턴 감지', () => {
    const trades = [
      makeTrade({ id: 1, action: 'SELL', taSnapshot: { rsi14: 20 } }),
      makeTrade({ id: 2, action: 'SELL', taSnapshot: { rsi14: 28 } }),
    ];

    const patterns = detector.detectPatterns(trades);
    const pattern = patterns.find((p) => p.name === '공포 매도');

    expect(pattern).toBeDefined();
    expect(pattern?.count).toBe(2);
  });

  it('단타 패턴 감지 (7일 내 매수→매도)', () => {
    const trades = [
      makeTrade({ id: 1, action: 'BUY', tradedAt: new Date('2026-01-10') }),
      makeTrade({ id: 2, action: 'SELL', tradedAt: new Date('2026-01-12') }),
      makeTrade({ id: 3, action: 'BUY', tradedAt: new Date('2026-01-15') }),
      makeTrade({ id: 4, action: 'SELL', tradedAt: new Date('2026-01-17') }),
      makeTrade({ id: 5, action: 'BUY', tradedAt: new Date('2026-01-20') }),
      makeTrade({ id: 6, action: 'SELL', tradedAt: new Date('2026-01-22') }),
    ];

    const patterns = detector.detectPatterns(trades);
    const pattern = patterns.find((p) => p.name === '단타 성향');

    expect(pattern).toBeDefined();
    expect(pattern?.count).toBe(3);
  });

  it('시그널 순응 패턴 감지', () => {
    const trades = [
      makeTrade({ id: 1, taSnapshot: { compositeScore: 50 } }),
      makeTrade({ id: 2, taSnapshot: { compositeScore: 40 } }),
      makeTrade({ id: 3, taSnapshot: { compositeScore: 60 } }),
    ];

    const patterns = detector.detectPatterns(trades);
    const pattern = patterns.find((p) => p.name === '시그널 순응 매매');

    expect(pattern).toBeDefined();
  });

  it('패턴 없으면 빈 배열 반환', () => {
    const trades = [
      makeTrade({ id: 1, taSnapshot: { rsi14: 50 } }),
    ];

    const patterns = detector.detectPatterns(trades);
    expect(patterns).toHaveLength(0);
  });
});
