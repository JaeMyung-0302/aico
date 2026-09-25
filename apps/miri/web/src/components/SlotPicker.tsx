import { NOTIFY_SLOTS, type NotifySlot } from "../domain.ts";
import { SLOT_LABEL } from "../screens/options.ts";
import styles from "./SlotPicker.module.scss";

/** 알림 시간대. 네 슬롯만 있고 자유 입력은 없다. */
export default function SlotPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: NotifySlot;
  onChange: (slot: NotifySlot) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.row} role="radiogroup" aria-label="알림 시간">
      {NOTIFY_SLOTS.map((slot) => {
        const on = slot === value;
        return (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={on}
            className={`${styles.chip} ${on ? styles.on : ""}`}
            disabled={disabled}
            onClick={() => onChange(slot)}
          >
            <span className={styles.name}>{SLOT_LABEL[slot]}</span>
            <span className={styles.time}>{slot}</span>
          </button>
        );
      })}
    </div>
  );
}
