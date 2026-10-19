import { useEffect, useRef, useState } from "react";
import { normalizeNumber, type NumberRange } from "../domain.ts";
import styles from "./NumberInput.module.scss";

type Props = {
  /** 낭독기가 읽는 이름. */
  label: string;
  /** 칸 위에 보이는 이름. null 이면 숨긴다(표의 둘째 줄부터처럼). 없으면 label. */
  shownLabel?: string | null;
  range: NumberRange;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

/**
 * 탭하면 숫자 키패드가 바로 뜨는 칸. +/- 를 여러 번 누르지 않고 90kg 을 한 번에 적는다.
 * 범위와 간격에 맞는 값만 올려 보내고, 맞지 않은 채 벗어나면 마지막 값으로 되돌린다.
 */
export default function NumberInput({ label, shownLabel, range, value, onChange, disabled = false }: Props) {
  const [text, setText] = useState(String(value));
  const editing = useRef(false);
  const parsed = normalizeNumber(range, Number(text));
  const invalid = text.trim() === "" || parsed === null;
  const decimal = !Number.isInteger(range.step);

  // 밖에서 값이 바뀌면(세트 복사, 예측 불러오기) 적는 중이 아닐 때만 따라간다.
  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);

  return (
    <label className={styles.field}>
      {shownLabel === null ? null : (
        <span className={styles.label} aria-hidden="true">
          {shownLabel ?? label}
        </span>
      )}
      <span className={`${styles.box} ${invalid ? styles.invalid : ""}`}>
        <input
          className={styles.input}
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          enterKeyHint="done"
          autoComplete="off"
          value={text}
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid || undefined}
          onFocus={(event) => {
            editing.current = true;
            event.currentTarget.select();
          }}
          onChange={(event) => {
            const next = event.target.value.replace(",", ".");
            setText(next);
            const number = normalizeNumber(range, Number(next));
            if (next.trim() !== "" && number !== null) onChange(number);
          }}
          onBlur={() => {
            editing.current = false;
            if (invalid) setText(String(value));
          }}
        />
        {range.unit ? <span className={styles.unit}>{range.unit}</span> : null}
      </span>
    </label>
  );
}
