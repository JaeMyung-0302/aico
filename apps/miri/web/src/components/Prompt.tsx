import type { ReactNode } from "react";
import { toneOf, type Answer, type TrackDef } from "../domain.ts";
import styles from "./Prompt.module.scss";

/** 크고 자신감 있는 질문. 화면당 하나. */
export function Question({ children }: { children: ReactNode }) {
  return <h2 className={styles.question}>{children}</h2>;
}

/** 지금까지 고른 경로. "헬스 · 가슴" */
export function Trace({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <p className={styles.trace}>
      {items.map((item, index) => (
        <span key={item} className={styles.crumb}>
          {index > 0 ? <span className={styles.sep}>·</span> : null}
          {item}
        </span>
      ))}
    </p>
  );
}

/** 답 한 건을 칩으로. 첫 칩은 하루의 색조 마커를 단다. 예측 카드와 완료 화면이 같이 쓴다. */
export function AnswerChips({
  track,
  answer,
}: {
  track: TrackDef;
  answer: Answer;
}) {
  const labels: string[] = [];
  for (const step of track.steps) {
    const value = answer[step.key];
    if (value === undefined) continue;
    const labelOf = (v: string) =>
      step.choices.find((choice) => choice.value === v)?.label ?? v;
    labels.push(
      Array.isArray(value) ? value.map(labelOf).join(" ") : labelOf(value),
    );
  }
  const tone = toneOf(track, answer);

  return (
    <ul className={styles.chips} aria-label="기록 내용">
      {labels.map((label, index) => (
        <li
          key={label}
          className={styles.chip}
          data-tone={index === 0 ? tone ?? undefined : undefined}
        >
          {index === 0 && tone ? <span className={styles.chipMarker} /> : null}
          {label}
        </li>
      ))}
    </ul>
  );
}

/** 실패 문구. 잔소리 없이 한 줄, 화면 낭독기에도 바로 알린다. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}

/** 확인 문구 묶음: "기록했어요" + 다음 약속. */
export function Confirm({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={styles.confirm}>
      <p className={styles.confirmTitle}>{title}</p>
      <p className={styles.confirmSub}>{sub}</p>
    </div>
  );
}
