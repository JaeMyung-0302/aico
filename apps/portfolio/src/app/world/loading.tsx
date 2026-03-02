import styles from "@/styles/world-loading.module.scss";

const WorldLoading = () => (
  <div className={styles.container}>
    <p className={styles.text}>3D 세계 로딩 중...</p>
    <div className={styles.progressBar}>
      <div className={styles.progressFill} />
    </div>
  </div>
);

export default WorldLoading;
