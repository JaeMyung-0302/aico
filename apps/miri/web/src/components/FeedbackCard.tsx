import styles from "./FeedbackCard.module.scss";

type Props = {
  text: string | null;
  /** 미리가 한마디를 다듬는 중. 오브가 숨 쉬며 기다림을 "보고 있다"로 바꾼다. */
  thinking: boolean;
};

/**
 * 기록 직후 돌려받는 한마디. 다듬는 동안은 생각 중 표시, 오면 그 자리에서 떠오른다.
 * 낭독기에는 문장이 바뀔 때 한 번 읽힌다.
 */
export default function FeedbackCard({ text, thinking }: Props) {
  if (!thinking && !text) return null;
  return (
    <div className={styles.slot} aria-live="polite">
      {thinking ? (
        <p className={`${styles.card} ${styles.thinking}`} role="status">
          <span className={styles.orb} aria-hidden="true" />
          <span>미리가 기록을 살펴보는 중</span>
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
      ) : (
        <p key={text} className={`${styles.card} ${styles.said}`}>
          {text}
        </p>
      )}
    </div>
  );
}
