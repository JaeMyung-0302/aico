interface BriefingPromptInput {
  date: string;
  items: Array<{
    symbol: string;
    score: number;
    rsi14?: number;
    macdHistogram?: number;
    interpretation: string;
  }>;
  newsContext?: string;
}

export const buildBriefingSummaryPrompt = (input: BriefingPromptInput): string => {
  const itemsSummary = input.items
    .map(
      (item) =>
        `- ${item.symbol}: 복합 스코어 ${item.score > 0 ? '+' : ''}${item.score}, RSI ${item.rsi14?.toFixed(1) ?? 'N/A'}, MACD 히스토그램 ${item.macdHistogram?.toFixed(4) ?? 'N/A'}`,
    )
    .join('\n');

  return `당신은 AI 투자 분석 비서입니다. 아래 데이터를 기반으로 한국어 아침 브리핑을 작성하세요.

## 날짜
${input.date}

## 포트폴리오 종목 분석 결과
${itemsSummary}

${input.newsContext ? `## 관련 뉴스 컨텍스트\n${input.newsContext}` : ''}

## 작성 규칙
1. 반드시 계산된 수치만 인용하세요. 추측하지 마세요.
2. "~하세요", "매수/매도 추천" 등 투자 자문 표현 절대 금지.
3. "~로 보입니다", "~한 상태입니다" 등 현재 상태 기술만 허용.
4. 각 종목별 1-2문장으로 핵심만 전달하세요.
5. 마지막에 전체 포트폴리오 요약 1문장을 추가하세요.
6. 면책 문구: "본 브리핑은 기술적 지표 계산 결과를 요약한 것이며, 투자 자문이 아닙니다."

## 출력 형식
### 📊 AlphaDesk 아침 브리핑 - {날짜}

**종목별 현황**
{종목별 분석}

**포트폴리오 요약**
{전체 요약}

---
⚖️ 본 브리핑은 기술적 지표 계산 결과를 요약한 것이며, 투자 자문이 아닙니다.`;
};
