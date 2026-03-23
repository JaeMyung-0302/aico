import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import styles from './BriefingPage.module.scss';

const BriefingPage = () => {
  const { data: briefings, isLoading } = useQuery({
    queryKey: ['briefings'],
    queryFn: async () => {
      const { data } = await api.get('/briefings');
      return data;
    },
  });

  if (isLoading) return <div className={styles.loading}>로딩 중...</div>;

  return (
    <div className={styles.page}>
      <h1>브리핑 히스토리</h1>
      {!briefings || briefings.length === 0 ? (
        <p className={styles.empty}>아직 브리핑이 없습니다. Pro 플랜 이상에서 매일 아침 브리핑을 받을 수 있습니다.</p>
      ) : (
        <div className={styles.list}>
          {briefings.map((b: any) => (
            <div key={b.id} className={styles.card}>
              <span className={styles.date}>
                {new Date(b.createdAt).toLocaleDateString('ko-KR')}
              </span>
              <span className={styles.via}>{b.sentVia}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BriefingPage;
