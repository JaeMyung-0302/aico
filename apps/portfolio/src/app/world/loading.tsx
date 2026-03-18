import styles from "@/styles/world-loading.module.scss";

const tips = [
  "WASD로 이동, 마우스로 시야 조작",
  "Q 키로 프로젝트 목록 열기",
  "포탈에 다가가면 다른 세계로 이동",
  "건물에 가까이 가면 프로젝트 정보 표시",
  "스킬 아이템을 수집해보세요",
];

const WorldLoading = () => {
  const tip = tips[Math.floor(Date.now() / 3000) % tips.length];

  return (
    <div className={styles.container}>
      <p className={styles.title}>3D 포트폴리오</p>
      <p className={styles.text}>세계를 구성하고 있습니다...</p>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} />
      </div>
      <p className={styles.tip}>{tip}</p>
    </div>
  );
};

export default WorldLoading;
