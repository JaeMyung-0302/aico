import styles from "./Skeleton.module.scss";

type Variant = "today" | "flow" | "settings";

/**
 * 첫 불러오기 동안 화면의 뼈대. 빈 화면 대신 곧 올 모양을 흐리게 먼저 그려
 * 데이터가 와도 자리가 흔들리지 않게 한다. 낭독기에는 "불러오는 중" 한 번만 알린다.
 */
export default function Skeleton({ variant }: { variant: Variant }) {
  return (
    <div className={styles.skeleton} role="status" aria-label="불러오는 중">
      {variant === "today" ? (
        <>
          <span className={`${styles.bar} ${styles.trace}`} />
          <span className={`${styles.bar} ${styles.question}`} />
          <div className={styles.grid}>
            <span className={styles.tile} />
            <span className={styles.tile} />
            <span className={styles.tile} />
            <span className={styles.tile} />
          </div>
        </>
      ) : null}
      {variant === "flow" ? (
        <>
          <span className={`${styles.bar} ${styles.question}`} />
          <span className={`${styles.bar} ${styles.caption}`} />
          <div className={styles.week}>
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} className={styles.dot} />
            ))}
          </div>
          <span className={`${styles.bar} ${styles.caption}`} />
          <span className={styles.block} />
        </>
      ) : null}
      {variant === "settings" ? (
        <>
          <span className={`${styles.bar} ${styles.question}`} />
          <span className={styles.row} />
          <span className={styles.card} />
          <span className={styles.card} />
        </>
      ) : null}
    </div>
  );
}
