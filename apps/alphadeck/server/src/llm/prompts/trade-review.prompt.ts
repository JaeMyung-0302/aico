interface TradeReviewInput {
  totalTrades: number;
  analyses: Array<{
    symbol: string;
    action: string;
    price: number;
    result: string;
    hindsight: string;
  }>;
  patterns: Array<{
    name: string;
    count: number;
    description: string;
    severity: string;
  }>;
}

export const buildTradeReviewPrompt = (input: TradeReviewInput): string => {
  const analysesSummary = input.analyses
    .map(
      (a) => `- ${a.symbol} ${a.action} @$${a.price}: ${a.result}\n  → ${a.hindsight}`,
    )
    .join('\n');

  const patternsSummary = input.patterns.length > 0
    ? input.patterns
        .map((p) => `- [${p.severity}] ${p.name} (${p.count}회): ${p.description}`)
        .join('\n')
    : '특별한 패턴이 감지되지 않았습니다.';

  return `당신은 AI 투자 복기 분석 비서입니다. 아래 데이터를 기반으로 한국어 복기 리포트를 작성하세요.

## 매매 기록 (총 ${input.totalTrades}건)
${analysesSummary}

## 감지된 행동 패턴
${patternsSummary}

## 작성 규칙
1. 계산된 수치만 인용하세요. 미래 예측 금지.
2. "~하세요" 등 투자 자문 표현 절대 금지.
3. "~한 패턴이 보입니다", "~한 경향이 있었습니다" 등 과거 사실 기술만 허용.
4. CRITICAL 패턴은 반드시 언급하세요.
5. 긍정적 패턴(시그널 순응 등)도 언급하세요.
6. 마지막에 개선할 수 있는 부분을 질문 형태로 제시하세요.

## 출력 형식
### 📋 투자 복기 리포트

**매매 분석 요약**
{매매별 핵심 분석}

**행동 패턴 분석**
{패턴별 분석}

**스스로 되돌아볼 질문**
{개선 질문 2-3개}

---
⚖️ 본 리포트는 과거 매매 기록의 기술적 지표 분석이며, 투자 자문이 아닙니다.`;
};
