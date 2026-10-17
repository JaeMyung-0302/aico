import { minutesToClock, type NumberStepDef } from "../domain.ts";
import styles from "./NumberGroup.module.scss";
import Stepper from "./Stepper.tsx";

type Props = {
  steps: NumberStepDef[];
  valueOf: (step: NumberStepDef) => number;
  onChange: (step: NumberStepDef, value: number) => void;
  disabled?: boolean;
};

/**
 * 한 화면에 함께 묻는 수들. 운동의 "시작"과 "얼마나"처럼 짝이 있는 값을 카드 하나에 둔다.
 * 시각 칸과 분 칸이 같이 있으면 끝나는 시각을 옆에 적어 범위로 읽히게 한다.
 */
export default function NumberGroup({ steps, valueOf, onChange, disabled = false }: Props) {
  const start = steps.find((step) => step.format === "time");
  const length = steps.find((step) => step.format !== "time" && step.unit === "분");
  const range =
    start && length
      ? `${minutesToClock(valueOf(start))} ~ ${minutesToClock((valueOf(start) + valueOf(length)) % (24 * 60))}`
      : null;

  return (
    <div className={styles.group}>
      {steps.map((step, index) => (
        <div key={step.key} className={styles.item}>
          {index > 0 ? <span className={styles.divider} aria-hidden="true" /> : null}
          <div className={styles.head}>
            <span className={styles.label}>{step.label ?? step.question}</span>
            {step === length && range ? <span className={styles.hint}>{range}</span> : null}
          </div>
          <Stepper
            large
            label={step.label ?? step.question}
            range={step}
            value={valueOf(step)}
            disabled={disabled}
            onChange={(value) => onChange(step, value)}
          />
        </div>
      ))}
    </div>
  );
}
