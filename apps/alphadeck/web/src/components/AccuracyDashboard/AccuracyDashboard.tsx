import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import styles from './AccuracyDashboard.module.scss';

interface AccuracyResult {
  signalType: string;
  total: number;
  correct: number;
  accuracy: number;
}

const signalTypeLabel: Record<string, string> = {
  RSI_OVERSOLD: 'RSI 과매도',
  RSI_OVERBOUGHT: 'RSI 과매수',
  MACD_BULLISH_CROSS: 'MACD 골든크로스',
  MACD_BEARISH_CROSS: 'MACD 데드크로스',
  BB_LOWER_BREAK: 'BB 하단 이탈',
  BB_UPPER_BREAK: 'BB 상단 이탈',
  VOLUME_SURGE: '거래량 급증',
  GOLDEN_CROSS: 'SMA 골든크로스',
  DEATH_CROSS: 'SMA 데드크로스',
};

const AccuracyDashboard = ({ symbol }: { symbol: string }) => {
  const { data, isLoading } = useQuery<AccuracyResult[]>({
    queryKey: ['accuracy', symbol],
    queryFn: async () => {
      const { data } = await api.get(`/backtest/accuracy?symbol=${symbol}`);
      return data;
    },
    enabled: !!symbol,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className={styles.container}>
      <h2>시그널 정확도 ({symbol})</h2>
      <p className={styles.subtitle}>시그널 발생 후 5일 내 방향 일치율</p>

      <div className={styles.grid}>
        {data.map((item) => (
          <div key={item.signalType} className={styles.card}>
            <span className={styles.type}>
              {signalTypeLabel[item.signalType] ?? item.signalType}
            </span>
            <div className={styles.bar}>
              <div
                className={styles.fill}
                style={{
                  width: `${item.accuracy}%`,
                  background: item.accuracy >= 60 ? '#22c55e' : item.accuracy >= 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className={styles.stats}>
              {item.accuracy}% ({item.correct}/{item.total})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccuracyDashboard;
