import styles from "./Orb.module.scss";

type Props = {
  size?: "sm" | "lg";
  /** asking: 묻는 중이라 후광이 맥동한다. done: 튀어오르며 체크를 그린다. */
  mood?: "idle" | "asking" | "done";
};

/** 미리의 존재감. 캐릭터 일러스트가 아니라 빛나는 둥근 점과 동공만 둔다. */
export default function Orb({ size = "sm", mood = "idle" }: Props) {
  const className = [
    styles.orb,
    size === "lg" ? styles.lg : styles.sm,
    mood === "done" ? styles.done : "",
    mood === "asking" ? styles.asking : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} aria-hidden="true">
      <span className={styles.pupil} />
      {mood === "done" ? (
        <svg className={styles.check} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 12.5l4 4L18 8"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}
