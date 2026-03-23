import styles from './BacktestResult.module.scss';

interface BacktestData {
  strategy: string;
  symbol: string;
  period: string;
  totalReturn: number;
  buyAndHoldReturn: number;
  trades: Array<{ date: string; action: string; price: number; reason: string }>;
  tradeCount: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

const BacktestResult = ({ result }: { result: BacktestData }) => {
  const outperforms = result.totalReturn > result.buyAndHoldReturn;

  return (
    <div className={styles.container}>
      <h2>{result.strategy} — {result.symbol} ({result.period})</h2>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.label}>전략 수익률</span>
          <span className={`${styles.value} ${result.totalReturn >= 0 ? styles.positive : styles.negative}`}>
            {result.totalReturn > 0 ? '+' : ''}{result.totalReturn}%
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>Buy & Hold</span>
          <span className={`${styles.value} ${result.buyAndHoldReturn >= 0 ? styles.positive : styles.negative}`}>
            {result.buyAndHoldReturn > 0 ? '+' : ''}{result.buyAndHoldReturn}%
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>초과 수익</span>
          <span className={`${styles.value} ${outperforms ? styles.positive : styles.negative}`}>
            {outperforms ? '+' : ''}{(result.totalReturn - result.buyAndHoldReturn).toFixed(2)}%
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>매매 횟수</span>
          <span className={styles.value}>{result.tradeCount}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>승률</span>
          <span className={styles.value}>{(result.winRate * 100).toFixed(0)}%</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>최대 낙폭</span>
          <span className={`${styles.value} ${styles.negative}`}>-{result.maxDrawdown}%</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>샤프 비율</span>
          <span className={styles.value}>{result.sharpeRatio}</span>
        </div>
      </div>

      <div className={styles.trades}>
        <h3>매매 내역</h3>
        {result.trades.slice(-10).map((t, i) => (
          <div key={i} className={styles.trade}>
            <span className={t.action === 'BUY' ? styles.buy : styles.sell}>{t.action}</span>
            <span>${t.price.toFixed(2)}</span>
            <span className={styles.date}>{t.date}</span>
            <span className={styles.reason}>{t.reason}</span>
          </div>
        ))}
        {result.trades.length > 10 && (
          <p className={styles.more}>... 외 {result.trades.length - 10}건</p>
        )}
      </div>
    </div>
  );
};

export default BacktestResult;
