import { useParams, Link } from 'react-router-dom';
import { useAnalysis } from '@/hooks/useAnalysis';
import CandlestickChart from '@/components/Chart/CandlestickChart';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import styles from './AnalysisPage.module.scss';

const scoreColor = (score: number) => {
  if (score >= 30) return '#22c55e';
  if (score <= -30) return '#ef4444';
  return '#f59e0b';
};

const scoreLabel = (score: number) => {
  if (score >= 50) return '강세';
  if (score >= 20) return '약세 우위';
  if (score <= -50) return '약세';
  if (score <= -20) return '매도 우위';
  return '중립';
};

const AnalysisPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const { data, isLoading, error } = useAnalysis(symbol ?? '');

  if (isLoading) return <div className={styles.loading}>분석 중...</div>;
  if (error) return <div className={styles.error}>분석 실패: {symbol}을 찾을 수 없습니다. <Link to="/">홈으로</Link></div>;
  if (!data) return null;

  const { signalScore, taResult, prices, interpretation } = data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.symbol}>{data.symbol}</h1>
        <div className={styles.scoreWrapper}>
          <span
            className={styles.score}
            style={{ color: scoreColor(signalScore.score) }}
          >
            {signalScore.score > 0 ? '+' : ''}{signalScore.score}
          </span>
          <span className={styles.scoreLabel}>{scoreLabel(signalScore.score)}</span>
        </div>
      </header>

      <section className={styles.chart}>
        <CandlestickChart prices={prices} taResult={taResult} />
      </section>

      <section className={styles.indicators}>
        <h2>기술적 지표</h2>
        <div className={styles.indicatorGrid}>
          {taResult.rsi14 != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>RSI (14)</span>
              <span className={styles.indicatorValue}>{taResult.rsi14.toFixed(1)}</span>
            </div>
          )}
          {taResult.macdHistogram != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>MACD Histogram</span>
              <span className={styles.indicatorValue}>{taResult.macdHistogram.toFixed(4)}</span>
            </div>
          )}
          {taResult.sma200 != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>SMA 200</span>
              <span className={styles.indicatorValue}>${taResult.sma200.toFixed(2)}</span>
            </div>
          )}
          {taResult.bbMiddle != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>볼린저 중심</span>
              <span className={styles.indicatorValue}>${taResult.bbMiddle.toFixed(2)}</span>
            </div>
          )}
          {taResult.volumeRatio != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>거래량 비율</span>
              <span className={styles.indicatorValue}>{taResult.volumeRatio.toFixed(2)}x</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.breakdown}>
        <h2>시그널 분해</h2>
        <div className={styles.breakdownList}>
          {signalScore.breakdown.map((b) => (
            <div key={b.name} className={styles.breakdownItem}>
              <span className={styles.breakdownName}>{b.name}</span>
              <span className={styles.breakdownDirection} data-direction={b.direction}>
                {b.direction}
              </span>
              <div className={styles.breakdownBar}>
                <div
                  className={styles.breakdownFill}
                  style={{
                    width: `${Math.abs(b.value) / 2}%`,
                    background: b.value > 0 ? '#22c55e' : b.value < 0 ? '#ef4444' : '#6b7280',
                    marginLeft: b.value < 0 ? 'auto' : undefined,
                  }}
                />
              </div>
              <span className={styles.breakdownValue}>{b.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>

      {interpretation && (
        <section className={styles.interpretation}>
          <h2>AI 해석</h2>
          <p>{interpretation}</p>
        </section>
      )}

      <Disclaimer />
    </div>
  );
};

export default AnalysisPage;
