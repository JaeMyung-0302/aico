import { describeNumber, type NumberRange } from "../domain.ts";
import styles from "./Stepper.module.scss";

type Props = {
  label: string;
  range: NumberRange;
  value: number;
  onChange: (value: number) => void;
  /** 한 줄에 여러 개 놓을 때. 라벨을 위로 올리고 버튼을 줄인다. */
  compact?: boolean;
  /** 화면의 주인공 값. 시각처럼 크게 읽혀야 하는 수. */
  large?: boolean;
  disabled?: boolean;
};

/** 간격만큼 더하고 빼되 범위 밖으로 나가지 않는다. 2.5kg 같은 소수 간격의 오차를 지운다. */
function stepBy(range: NumberRange, value: number, direction: 1 | -1): number {
  const next = Number((value + direction * range.step).toFixed(3));
  return Math.min(range.max, Math.max(range.min, next));
}

/** 키보드 없이 +/- 로 고르는 수. 값은 단위와 함께 가운데에 크게. */
export default function Stepper({
  label,
  range,
  value,
  onChange,
  compact = false,
  large = false,
  disabled = false,
}: Props) {
  return (
    <div
      className={`${styles.stepper} ${compact ? styles.compact : ""} ${large ? styles.large : ""}`}
      role="group"
      aria-label={label}
    >
      {compact ? <span className={styles.label}>{label}</span> : null}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          aria-label={`${label} 줄이기`}
          disabled={disabled || value <= range.min}
          onClick={() => onChange(stepBy(range, value, -1))}
        >
          −
        </button>
        <output className={styles.value} aria-live="polite">
          {describeNumber(range, value)}
        </output>
        <button
          type="button"
          className={styles.button}
          aria-label={`${label} 늘리기`}
          disabled={disabled || value >= range.max}
          onClick={() => onChange(stepBy(range, value, 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
