import { TaResultData } from '../../ta-engine/ta-engine.service';
import { SignalScore } from '../../ta-engine/interfaces/signal-score.interface';
import { REGULATORY_GUARD } from './regulatory-guard.prompt';

export const buildTaInterpretationPrompt = (
  symbol: string,
  currentPrice: number,
  taResult: TaResultData,
  signalScore: SignalScore,
): string => {
  const breakdownText = signalScore.breakdown
    .map((b) => `- ${b.name}: ${b.value.toFixed(1)} (${b.direction}, 가중치 ${(b.weight * 100).toFixed(0)}%)`)
    .join('\n');

  return `
${REGULATORY_GUARD}

다음은 ${symbol} (현재가: $${currentPrice.toFixed(2)})의 기술적 분석 결과입니다.
이 데이터를 바탕으로 한국어로 간결하게 해석해주세요. 3-5문장으로 요약하세요.

## 기술적 지표
- SMA 20: ${taResult.sma20?.toFixed(2) ?? 'N/A'}
- SMA 50: ${taResult.sma50?.toFixed(2) ?? 'N/A'}
- SMA 200: ${taResult.sma200?.toFixed(2) ?? 'N/A'}
- RSI (14): ${taResult.rsi14?.toFixed(2) ?? 'N/A'}
- MACD Line: ${taResult.macdLine?.toFixed(4) ?? 'N/A'}
- MACD Signal: ${taResult.macdSignal?.toFixed(4) ?? 'N/A'}
- MACD Histogram: ${taResult.macdHistogram?.toFixed(4) ?? 'N/A'}
- 볼린저 상단: ${taResult.bbUpper?.toFixed(2) ?? 'N/A'}
- 볼린저 중단: ${taResult.bbMiddle?.toFixed(2) ?? 'N/A'}
- 볼린저 하단: ${taResult.bbLower?.toFixed(2) ?? 'N/A'}
- 거래량 비율 (20일 대비): ${taResult.volumeRatio?.toFixed(2) ?? 'N/A'}

## 복합 시그널 스코어: ${signalScore.score}/100
${breakdownText}

위 데이터를 기반으로 현재 기술적 상황을 객관적으로 요약해주세요.
`.trim();
};
