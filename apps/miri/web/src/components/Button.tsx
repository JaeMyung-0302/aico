import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.scss";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  busy?: boolean;
};

/** 전폭 필 버튼. primary 는 발광, ghost 는 테두리만. */
export default function Button({
  variant = "primary",
  busy = false,
  children,
  ...rest
}: Props) {
  const className = [
    styles.button,
    variant === "ghost" ? styles.ghost : styles.primary,
  ].join(" ");
  return (
    <button
      className={className}
      type="button"
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
