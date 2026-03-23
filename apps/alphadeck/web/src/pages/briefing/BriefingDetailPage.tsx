import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import styles from './BriefingPage.module.scss';

interface BriefingContent {
  userId: number;
  date: string;
  items: Array<{
    symbol: string;
    score: number;
    interpretation: string;
    rsi14?: number;
    macdHistogram?: number;
  }>;
}

interface BriefingLog {
  id: number;
  content: BriefingContent;
  sentVia: string;
  createdAt: string;
}

const BriefingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: briefing, isLoading } = useQuery<BriefingLog>({
    queryKey: ['briefing', id],
    queryFn: async () => {
      const { data } = await api.get(`/briefings/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className={styles.loading}>로딩 중...</div>;
  if (!briefing) return <div className={styles.empty}>브리핑을 찾을 수 없습니다.</div>;

  const content = briefing.content;

  return (
    <div className={styles.page}>
      <button className={styles.backButton} onClick={() => navigate('/briefing')}>
        ← 돌아가기
      </button>

      <h1>
        📊 아침 브리핑 - {new Date(briefing.createdAt).toLocaleDateString('ko-KR')}
      </h1>

      <div className={styles.detail}>
        {content.items.map((item) => (
          <div key={item.symbol} className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <span className={styles.symbol}>{item.symbol}</span>
              <span
                className={
                  item.score > 0
                    ? styles.positive
                    : item.score < 0
                      ? styles.negative
                      : styles.neutral
                }
              >
                {item.score > 0 ? '+' : ''}{item.score}
              </span>
            </div>
            <div className={styles.detailMeta}>
              {item.rsi14 != null && <span>RSI: {item.rsi14.toFixed(1)}</span>}
              {item.macdHistogram != null && (
                <span>MACD: {item.macdHistogram.toFixed(4)}</span>
              )}
            </div>
            <p className={styles.interpretation}>{item.interpretation}</p>
          </div>
        ))}
      </div>

      <Disclaimer />
    </div>
  );
};

export default BriefingDetailPage;
