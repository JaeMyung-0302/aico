import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import PricingModal from '@/components/PricingModal/PricingModal';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import type { Plan } from '@/types/user';
import api from '@/lib/api';
import styles from './MyPage.module.scss';

const MyPage = () => {
  const { user, fetchMe, logout } = useAuthStore();
  const { isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription();
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  if (!user) return null;

  const handleSelectPlan = async (plan: Plan) => {
    try {
      await api.post('/payment/subscribe', { plan });
      await fetchMe();
      setIsPricingOpen(false);
    } catch (error) {
      console.error('Plan change failed:', error);
    }
  };

  return (
    <div className={styles.page}>
      <h1>마이페이지</h1>

      <section className={styles.section}>
        <h2>계정 정보</h2>
        <div className={styles.info}>
          <span className={styles.label}>이메일</span>
          <span>{user.email}</span>
        </div>
        <div className={styles.info}>
          <span className={styles.label}>닉네임</span>
          <span>{user.nickname}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>플랜</h2>
        <div className={styles.planCard}>
          <span className={styles.planBadge}>{user.plan}</span>
          <button
            className={styles.button}
            onClick={() => setIsPricingOpen(true)}
          >
            플랜 변경
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>알림 설정</h2>
        <div className={styles.info}>
          <span className={styles.label}>웹 푸시 알림</span>
          <button
            className={styles.button}
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={pushLoading}
          >
            {pushLoading ? '처리 중...' : isSubscribed ? '알림 끄기' : '알림 켜기'}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <button className={styles.logoutButton} onClick={logout}>
          로그아웃
        </button>
      </section>

      <PricingModal
        isOpen={isPricingOpen}
        currentPlan={user.plan}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={handleSelectPlan}
      />

      <Disclaimer />
    </div>
  );
};

export default MyPage;
