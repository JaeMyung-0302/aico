import styles from './StrategyCompare.module.scss';

interface BacktestData {
  strategy: string;
  totalReturn: number;
  buyAndHoldReturn: number;
  tradeCount: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

const StrategyCompare = ({ results }: { results: BacktestData[] }) => {
  const sorted = [...results].sort((a, b) => b.totalReturn - a.totalReturn);

  return (
    <div className={styles.container}>
      <h2>전략 비교</h2>
      <div className={styles.table}>
        <div className={styles.headerRow}>
          <span>전략</span>
          <span>수익률</span>
          <span>B&H 대비</span>
          <span>매매수</span>
          <span>승률</span>
          <span>최대낙폭</span>
          <span>샤프</span>
        </div>
        {sorted.map((r) => (
          <div key={r.strategy} className={styles.row}>
            <span className={styles.strategy}>{r.strategy}</span>
            <span className={r.totalReturn >= 0 ? styles.positive : styles.negative}>
              {r.totalReturn > 0 ? '+' : ''}{r.totalReturn}%
            </span>
            <span className={r.totalReturn > r.buyAndHoldReturn ? styles.positive : styles.negative}>
              {r.totalReturn > r.buyAndHoldReturn ? '+' : ''}
              {(r.totalReturn - r.buyAndHoldReturn).toFixed(1)}%
            </span>
            <span>{r.tradeCount}</span>
            <span>{(r.winRate * 100).toFixed(0)}%</span>
            <span className={styles.negative}>-{r.maxDrawdown}%</span>
            <span>{r.sharpeRatio}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyCompare;
