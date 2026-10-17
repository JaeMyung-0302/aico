import styles from "./Nav.module.scss";

export const VIEWS = ["today", "flow", "settings"] as const;
export type View = (typeof VIEWS)[number];

const LABEL: Record<View, string> = {
  today: "오늘",
  flow: "흐름",
  settings: "설정",
};

export function isView(value: unknown): value is View {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value);
}

/** 세 화면 사이를 오가는 분절 필. 화면은 바뀌어도 캔버스는 그대로다. */
export default function Nav({
  current,
  onChange,
}: {
  current: View;
  onChange: (view: View) => void;
}) {
  return (
    <nav className={styles.nav} aria-label="화면">
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          className={`${styles.tab} ${view === current ? styles.on : ""}`}
          aria-current={view === current ? "page" : undefined}
          onClick={() => onChange(view)}
        >
          {LABEL[view]}
        </button>
      ))}
    </nav>
  );
}
