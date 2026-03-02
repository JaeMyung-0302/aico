import styles from "@/styles/loading.module.scss";

const Loading = () => {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
    </div>
  );
};

export default Loading;
