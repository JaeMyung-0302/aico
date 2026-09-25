import styles from "./Toggle.module.scss";

/** 켬/끔 스위치. 라벨을 누르면 같이 바뀐다. */
export default function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={styles.toggle}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
      <span className={`${styles.track} ${checked ? styles.on : ""}`} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
