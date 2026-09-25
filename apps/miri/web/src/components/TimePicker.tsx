import { NOTIFY_PRESETS, NOTIFY_STEP_MINUTES } from "../domain.ts";
import { isPreset, PRESET_LABEL } from "../screens/options.ts";
import styles from "./TimePicker.module.scss";

/** HH:MM 을 10분 단위로 내림한다. 휠 밖에서 들어온 값도 규칙에 맞춘다. */
function snap(time: string): string {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const snapped = Math.floor(minutes / NOTIFY_STEP_MINUTES) * NOTIFY_STEP_MINUTES;
  return `${String(hours).padStart(2, "0")}:${String(snapped).padStart(2, "0")}`;
}

/**
 * 알림 시각. 프리셋 4개는 한 탭, "직접"은 기기 휠로 10분 단위.
 * 숫자 타이핑은 없다. 모바일 time 입력은 휠로 뜬다.
 */
export default function TimePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}) {
  const custom = !isPreset(value);

  return (
    <div className={styles.picker}>
      <div className={styles.row} role="radiogroup" aria-label="알림 시간">
        {NOTIFY_PRESETS.map((preset) => {
          const on = preset === value;
          return (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={on}
              className={`${styles.chip} ${on ? styles.on : ""}`}
              disabled={disabled}
              onClick={() => onChange(preset)}
            >
              <span className={styles.name}>{PRESET_LABEL[preset]}</span>
              <span className={styles.time}>{preset}</span>
            </button>
          );
        })}
        <label
          className={`${styles.chip} ${styles.custom} ${custom ? styles.on : ""}`}
          aria-label="직접 정하기"
        >
          <span className={styles.name}>직접</span>
          <input
            className={styles.input}
            type="time"
            step={NOTIFY_STEP_MINUTES * 60}
            value={custom ? value : ""}
            disabled={disabled}
            onChange={(event) => {
              if (event.target.value) onChange(snap(event.target.value));
            }}
          />
          <span className={styles.time}>{custom ? value : "--:--"}</span>
        </label>
      </div>
    </div>
  );
}
