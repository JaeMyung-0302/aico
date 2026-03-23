import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import PatternCard from '@/components/PatternCard/PatternCard';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import styles from './ReviewReportPage.module.scss';

interface TradeAnalysis {
  tradeId: number;
  symbol: string;
  action: string;
  price: number;
  tradedAt: string;
  result: string;
  hindsight: string;
  taAtTime: {
    rsi14?: number;
    compositeScore?: number;
  };
}

interface Pattern {
  name: string;
  count: number;
  total: number;
  ratio: number;
  description: string;
  severity: string;
}

interface ReviewResult {
  totalTrades: number;
  tradeAnalyses: TradeAnalysis[];
  patterns: Pattern[];
  interpretation: string;
  generatedAt: string;
  error?: string;
}

const ReviewReportPage = () => {
  const navigate = useNavigate();

  const generateReview = useMutation<ReviewResult>({
    mutationFn: async () => {
      const { data } = await api.post('/trades/review');
      return data;
    },
  });

  const data = generateReview.data;

  return (
    <div className={styles.page}>
      <button className={styles.backButton} onClick={() => navigate('/trades')}>
        ← 매매 기록으로
      </button>

      <h1>AI 투자 복기</h1>

      {!data && !generateReview.isPending && (
        <div className={styles.startCard}>
          <p>매매 기록을 분석하여 행동 패턴과 개선점을 찾아드립니다.</p>
          <button
            className={styles.generateButton}
            onClick={() => generateReview.mutate()}
          >
            복기 분석 시작
          </button>
        </div>
      )}

      {generateReview.isPending && (
        <div className={styles.loading}>분석 중... (최대 30초 소요)</div>
      )}

      {data?.error && (
        <div className={styles.error}>{data.error}</div>
      )}

      {data && !data.error && (
        <>
          <section className={styles.section}>
            <h2>매매 분석 ({data.totalTrades}건)</h2>
            <div className={styles.analysisList}>
              {data.tradeAnalyses.map((a) => (
                <div
                  key={a.tradeId}
                  className={`${styles.analysisCard} ${a.result.startsWith('RISKY') ? styles.risky : a.result.startsWith('GOOD') ? styles.good : ''}`}
                >
                  <div className={styles.analysisHeader}>
                    <span className={styles.symbol}>{a.symbol}</span>
                    <span className={a.action === 'BUY' ? styles.buy : styles.sell}>
                      {a.action === 'BUY' ? '매수' : '매도'} @${a.price}
                    </span>
                    <span className={styles.date}>
                      {new Date(a.tradedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className={styles.result}>{a.result}</p>
                  <p className={styles.hindsight}>{a.hindsight}</p>
                </div>
              ))}
            </div>
          </section>

          {data.patterns.length > 0 && (
            <section className={styles.section}>
              <h2>행동 패턴</h2>
              <div className={styles.patternList}>
                {data.patterns.map((p) => (
                  <PatternCard key={p.name} pattern={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Disclaimer />
    </div>
  );
};

export default ReviewReportPage;
