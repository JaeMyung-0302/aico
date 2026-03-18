"use client";

import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/onboarding.module.scss";

export const OnboardingOverlay = () => {
  const showOnboarding = useWorldStore((s) => s.showOnboarding);
  const setShowOnboarding = useWorldStore((s) => s.setShowOnboarding);
  const startTour = useWorldStore((s) => s.startTour);

  if (!showOnboarding) return null;

  const handleFreeroam = () => {
    setShowOnboarding(false);
  };

  const handleTour = () => {
    startTour();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h2 className={styles.title}>3D 포트폴리오에 오신 것을 환영합니다</h2>
        <p className={styles.subtitle}>
          3개 월드 · 6개 프로젝트 · 13개 스킬 수집품
        </p>

        <div className={styles.cards}>
          <button type="button" className={styles.card} onClick={handleFreeroam}>
            <span className={styles.cardIcon}>🎮</span>
            <span className={styles.cardTitle}>자유 탐색</span>
            <span className={styles.cardDesc}>
              WASD + 마우스로 직접 이동하며 탐색합니다
            </span>
          </button>

          <button type="button" className={styles.card} onClick={handleTour}>
            <span className={styles.cardIcon}>🚀</span>
            <span className={styles.cardTitle}>가이드 투어</span>
            <span className={styles.cardDesc}>
              프로젝트를 자동으로 순회하며 안내합니다
            </span>
            <span className={styles.badge}>추천</span>
          </button>
        </div>
      </div>
    </div>
  );
};
