import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import SignalCard from '@/components/SignalCard/SignalCard';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import type { SignalLog } from '@/types/signal';
import styles from './SignalsPage.module.scss';

const SignalsPage = () => {
  const queryClient = useQueryClient();

  const { data: signals, isLoading } = useQuery<SignalLog[]>({
    queryKey: ['signals'],
    queryFn: async () => {
      const { data } = await api.get('/signals/history');
      return data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/signals/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
    },
  });

  if (isLoading) return <div className={styles.loading}>로딩 중...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>시그널 알림</h1>
        <Link to="/signals/settings" className={styles.settingsLink}>
          알림 설정
        </Link>
      </div>

      {!signals || signals.length === 0 ? (
        <p className={styles.empty}>
          아직 시그널이 없습니다. 포트폴리오에 종목을 등록하면 자동으로 시그널을 감지합니다.
        </p>
      ) : (
        <div className={styles.list}>
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}

      <Disclaimer />
    </div>
  );
};

export default SignalsPage;
