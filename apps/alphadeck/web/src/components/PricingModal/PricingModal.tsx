import type { Plan } from '@/types/user';
import styles from './PricingModal.module.scss';

interface PricingModalProps {
  isOpen: boolean;
  currentPlan: Plan;
  onClose: () => void;
  onSelectPlan: (plan: Plan) => void;
}

const PLANS = [
  {
    id: 'FREE' as Plan,
    name: 'Free',
    price: '₩0',
    period: '',
    features: [
      '종목 분석 (일 3회)',
      '포트폴리오 3종목',
      '주간 브리핑 (월요일)',
    ],
  },
  {
    id: 'PRO' as Plan,
    name: 'Pro',
    price: '₩9,900',
    period: '/월',
    features: [
      '종목 분석 무제한',
      '포트폴리오 20종목',
      '매일 아침 브리핑',
      '이메일 + 웹 푸시 알림',
      'LLM 해석 포함',
    ],
    recommended: true,
  },
  {
    id: 'MAX' as Plan,
    name: 'Max',
    price: '₩29,900',
    period: '/월',
    features: [
      'Pro 모든 기능',
      '포트폴리오 무제한',
      '시그널 알림 (5분 폴링)',
      '투자 복기 AI',
      '행동 패턴 분석',
      '백테스트 시뮬레이션',
    ],
  },
];

const PricingModal = ({ isOpen, currentPlan, onClose, onSelectPlan }: PricingModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2 className={styles.title}>플랜 선택</h2>

        <div className={styles.plans}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.plan} ${plan.recommended ? styles.recommended : ''} ${currentPlan === plan.id ? styles.current : ''}`}
            >
              {plan.recommended && <span className={styles.badge}>추천</span>}
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.price}>
                {plan.price}
                {plan.period && <span className={styles.period}>{plan.period}</span>}
              </div>
              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className={styles.selectButton}
                disabled={currentPlan === plan.id}
                onClick={() => onSelectPlan(plan.id)}
              >
                {currentPlan === plan.id ? '현재 플랜' : '선택'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
