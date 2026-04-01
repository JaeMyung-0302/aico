import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalysis } from '@/hooks/useAnalysis';
import CandlestickChart from '@/components/Chart/CandlestickChart';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import type { Interval, NewsContext, AccuracyResult } from '@/types/analysis';
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

const sentimentColor = (s: number) => (s > 0 ? '#22c55e' : s < 0 ? '#ef4444' : '#6b7280');
const sentimentBadge = (s: 'positive' | 'negative' | 'neutral') =>
  s === 'positive' ? '#22c55e' : s === 'negative' ? '#ef4444' : '#6b7280';

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '1d', label: '일봉' },
  { value: '1wk', label: '주봉' },
  { value: '1mo', label: '월봉' },
];

const NewsSection = ({ newsContext }: { newsContext: NewsContext }) => (
  <section className={styles.newsSection}>
    <h2>뉴스 & 감성</h2>
    <div className={styles.sentimentBadge} style={{ color: sentimentColor(newsContext.overallSentiment) }}>
      감성 점수: {newsContext.overallSentiment > 0 ? '+' : ''}{newsContext.overallSentiment}
    </div>
    {newsContext.articles.length > 0 ? (
      <div className={styles.articlesList}>
        {newsContext.articles.map((a, i) => (
          <div key={i} className={styles.articleItem}>
            <span className={styles.articleSentiment} style={{ background: sentimentBadge(a.sentiment) }}>
              {a.sentiment}
            </span>
            <div>
              <div className={styles.articleTitle}>{a.title}</div>
              <div className={styles.articleSummary}>{a.summary}</div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className={styles.noData}>뉴스 정보를 가져올 수 없습니다.</p>
    )}
    {newsContext.upcomingEvents.length > 0 && (
      <div className={styles.events}>
        <h3>예정 이벤트</h3>
        {newsContext.upcomingEvents.map((e, i) => (
          <div key={i} className={styles.eventItem}>
            <span className={styles.eventDate}>{e.date}</span>
            <span className={styles.eventType}>{e.type}</span>
            <span>{e.description}</span>
          </div>
        ))}
      </div>
    )}
    <p className={styles.newsDisclaimer}>뉴스 요약은 사실 전달 목적이며, 투자 조언이 아닙니다.</p>
  </section>
);

const AccuracySection = ({ accuracy }: { accuracy: AccuracyResult[] }) => (
  <section className={styles.accuracySection}>
    <h2>시그널 정확도</h2>
    <div className={styles.accuracyGrid}>
      {accuracy.map((a) => (
        <div key={a.signalType} className={styles.accuracyCard}>
          <span className={styles.accuracyType}>{a.signalType}</span>
          <span className={styles.accuracyValue}>{a.accuracy}%</span>
          <div className={styles.accuracyBar}>
            <div
              className={styles.accuracyFill}
              style={{
                width: `${a.accuracy}%`,
                background: a.accuracy >= 60 ? '#22c55e' : a.accuracy >= 40 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <span className={styles.accuracyDetail}>{a.correct}/{a.total}</span>
        </div>
      ))}
    </div>
  </section>
);

const AnalysisPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [interval, setInterval] = useState<Interval>('1d');
  const { data, isLoading, error } = useAnalysis(symbol ?? '', interval);

  if (isLoading) return <div className={styles.loading}>분석 중...</div>;
  if (error) return <div className={styles.error}>분석 실패: {symbol}을 찾을 수 없습니다. <Link to="/">홈으로</Link></div>;
  if (!data) return null;

  const { signalScore, taResult, prices, interpretation, newsContext, accuracy } = data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.symbol}>{data.symbol}</h1>
        <div className={styles.scoreWrapper}>
          <span className={styles.score} style={{ color: scoreColor(signalScore.score) }}>
            {signalScore.score > 0 ? '+' : ''}{signalScore.score}
          </span>
          <span className={styles.scoreLabel}>{scoreLabel(signalScore.score)}</span>
        </div>
      </header>

      <div className={styles.timeframeWrapper}>
        {INTERVALS.map((t) => (
          <button
            key={t.value}
            className={styles.timeframeTab}
            data-active={interval === t.value}
            onClick={() => setInterval(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

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
          {taResult.atr14 != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>ATR (14)</span>
              <span className={styles.indicatorValue}>{taResult.atr14.toFixed(2)}</span>
            </div>
          )}
          {taResult.obv != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>OBV</span>
              <span className={styles.indicatorValue}>{(taResult.obv / 1e6).toFixed(1)}M</span>
            </div>
          )}
          {taResult.stochasticK != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>Stochastic K/D</span>
              <span className={styles.indicatorValue}>
                {taResult.stochasticK.toFixed(1)} / {taResult.stochasticD?.toFixed(1) ?? '-'}
              </span>
            </div>
          )}
          {taResult.adx14 != null && (
            <div className={styles.indicatorCard}>
              <span className={styles.indicatorName}>ADX (14)</span>
              <span className={styles.indicatorValue}>{taResult.adx14.toFixed(1)}</span>
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
          <h2>AI 분석</h2>
          <p>{interpretation}</p>
        </section>
      )}

      {newsContext && <NewsSection newsContext={newsContext} />}

      {accuracy && accuracy.length > 0 && <AccuracySection accuracy={accuracy} />}

      <Disclaimer />
    </div>
  );
};

export default AnalysisPage;
