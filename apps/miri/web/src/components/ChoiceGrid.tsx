import type { Tone } from "../domain.ts";
import styles from "./ChoiceGrid.module.scss";

export type Choice<T extends string> = {
  value: T;
  label: string;
  /** 마커 색조. 첫 단계 선택지가 갖고, 뒤 단계는 물려받는다. */
  tone?: Tone;
  /** 마커 길이. 정도를 나타내는 단계에 쓴다(1–3). */
  level?: 1 | 2 | 3;
};

type Props<T extends string> = {
  label: string;
  choices: Choice<T>[];
  columns: 2 | 3;
  /** 넘기면 토글형이 된다. 고른 타일은 켜진 상태로 남고 aria-pressed 를 단다. */
  selected?: T[];
  onPick: (value: T) => void;
};

/** 큰 터치 타겟(≥56px)의 유리 타일. 등장은 순차, 프레스는 스프링. */
export default function ChoiceGrid<T extends string>({
  label,
  choices,
  columns,
  selected,
  onPick,
}: Props<T>) {
  return (
    <div
      className={`${styles.grid} ${columns === 3 ? styles.cols3 : styles.cols2}`}
      role="group"
      aria-label={label}
    >
      {choices.map((choice) => {
        const on = selected?.includes(choice.value) ?? false;
        return (
          <button
            key={choice.value}
            className={`${styles.tile} ${on ? styles.on : ""}`}
            type="button"
            data-tone={choice.tone}
            data-level={choice.level}
            aria-pressed={selected ? on : undefined}
            onClick={() => onPick(choice.value)}
          >
            <span className={styles.marker} />
            <span className={styles.label}>{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}
