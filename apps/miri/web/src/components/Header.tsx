import Orb from "./Orb.tsx";
import styles from "./Header.module.scss";

export function Wordmark() {
  return <span className={styles.wordmark}>Miri</span>;
}

type ProgressProps = { current: number; total: number };

/** 선택 경로(헬스 3단계, 유산소 2단계)에서만 보이는 진행점. 읽기 전용 장식. */
export function Progress({ current, total }: ProgressProps) {
  return (
    <span className={styles.progress} aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`${styles.dot} ${index <= current ? styles.dotOn : ""}`}
        />
      ))}
    </span>
  );
}

type LoggerHeaderProps = {
  progress: ProgressProps | null;
  mood?: "idle" | "asking";
};

/** 로거 헤더: 워드마크 · 진행점 · 빼꼼 내다보는 오브. */
export function LoggerHeader({ progress, mood = "idle" }: LoggerHeaderProps) {
  return (
    <>
      <Wordmark />
      <span className={styles.right}>
        {progress ? <Progress {...progress} /> : null}
        <Orb size="sm" mood={mood} />
      </span>
    </>
  );
}
