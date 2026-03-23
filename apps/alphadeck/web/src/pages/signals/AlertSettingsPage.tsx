import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import styles from './AlertSettingsPage.module.scss';

interface AlertPreference {
  id: number;
  symbol: string;
  enabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

const AlertSettingsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: preferences, isLoading } = useQuery<AlertPreference[]>({
    queryKey: ['alert-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/signals/preferences');
      return data;
    },
  });

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data } = await api.get('/portfolios');
      return data;
    },
  });

  const updatePreference = useMutation({
    mutationFn: async ({
      symbol,
      data,
    }: {
      symbol: string;
      data: { enabled: boolean; emailEnabled: boolean; pushEnabled: boolean };
    }) => {
      await api.put(`/signals/preferences/${symbol}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences'] });
    },
  });

  if (isLoading) return <div>로딩 중...</div>;

  const symbols = [
    ...new Set(
      portfolios?.flatMap((p: any) => p.items?.map((i: any) => i.symbol) ?? []) ?? [],
    ),
  ] as string[];

  const getPref = (symbol: string): AlertPreference | undefined =>
    preferences?.find((p) => p.symbol === symbol);

  const handleToggle = (
    symbol: string,
    field: 'enabled' | 'emailEnabled' | 'pushEnabled',
  ) => {
    const current = getPref(symbol);
    const data = {
      enabled: current?.enabled ?? true,
      emailEnabled: current?.emailEnabled ?? true,
      pushEnabled: current?.pushEnabled ?? true,
    };
    updatePreference.mutate({
      symbol,
      data: { ...data, [field]: !data[field] },
    });
  };

  return (
    <div className={styles.page}>
      <button className={styles.backButton} onClick={() => navigate('/signals')}>
        ← 돌아가기
      </button>
      <h1>알림 설정</h1>

      {symbols.length === 0 ? (
        <p className={styles.empty}>포트폴리오에 종목을 먼저 등록하세요.</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>종목</span>
            <span>활성</span>
            <span>이메일</span>
            <span>푸시</span>
          </div>
          {symbols.map((symbol) => {
            const pref = getPref(symbol);
            return (
              <div key={symbol} className={styles.tableRow}>
                <span className={styles.symbol}>{symbol}</span>
                <button
                  className={`${styles.toggle} ${pref?.enabled !== false ? styles.on : ''}`}
                  onClick={() => handleToggle(symbol, 'enabled')}
                >
                  {pref?.enabled !== false ? 'ON' : 'OFF'}
                </button>
                <button
                  className={`${styles.toggle} ${pref?.emailEnabled !== false ? styles.on : ''}`}
                  onClick={() => handleToggle(symbol, 'emailEnabled')}
                >
                  {pref?.emailEnabled !== false ? 'ON' : 'OFF'}
                </button>
                <button
                  className={`${styles.toggle} ${pref?.pushEnabled !== false ? styles.on : ''}`}
                  onClick={() => handleToggle(symbol, 'pushEnabled')}
                >
                  {pref?.pushEnabled !== false ? 'ON' : 'OFF'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertSettingsPage;
