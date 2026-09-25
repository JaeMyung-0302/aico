import { useEffect, useState, type ReactNode } from "react";
import { fetchHistory, UnknownUserError, type History } from "../api.ts";
import Canvas from "../components/Canvas.tsx";
import { LoggerHeader } from "../components/Header.tsx";
import { ErrorNote, Question } from "../components/Prompt.tsx";
import { shiftDate, weekdayOf } from "../dates.ts";
import {
  KIND_LABEL,
  KINDS,
  PART_LABEL,
  PARTS,
  type Entry,
} from "../domain.ts";
import styles from "./Flow.module.scss";

const DAYS = 35;
const WEEKS = DAYS / 7;
const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const RING_RADIUS = 18;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

type ByDate = Map<string, Entry>;

/** 월요일부터 시작하는 주 단위 격자. 마지막 줄이 오늘이 든 주. */
function buildWeeks(today: string, days: number): string[][] {
  const offsetToMonday = (weekdayOf(today) + 6) % 7;
  const lastMonday = shiftDate(today, -offsetToMonday);
  const weekCount = Math.ceil((days + offsetToMonday) / 7);
  return Array.from({ length: weekCount }, (_, row) => {
    const monday = shiftDate(lastMonday, -7 * (weekCount - 1 - row));
    return Array.from({ length: 7 }, (_, col) => shiftDate(monday, col));
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.caption}>{title}</h3>
      {children}
    </section>
  );
}

/** 이번 주 7칸. 종류별 색점, 오늘은 고리. */
function WeekStrip({ today, byDate }: { today: string; byDate: ByDate }) {
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6));
  return (
    <ol className={styles.strip} aria-label="최근 7일">
      {days.map((date) => {
        const entry = byDate.get(date);
        const label = WEEKDAY_LABELS[(weekdayOf(date) + 6) % 7];
        return (
          <li key={date} className={styles.day}>
            <span className={styles.dayLabel}>{label}</span>
            <span
              className={`${styles.dot} ${entry ? styles.dotOn : ""} ${date === today ? styles.today : ""}`}
              data-kind={entry?.kind}
              title={entry ? `${date} ${KIND_LABEL[entry.kind]}` : date}
            />
          </li>
        );
      })}
    </ol>
  );
}

/** 5주 히트맵. 색은 종류(정체성), 빈 칸은 기록 없음. 범례가 항상 함께 있다. */
function Heatmap({ today, byDate }: { today: string; byDate: ByDate }) {
  const weeks = buildWeeks(today, DAYS);
  const start = shiftDate(today, -(DAYS - 1));
  return (
    <div className={styles.heat} role="img" aria-label={`최근 ${DAYS}일 기록`}>
      {weeks.flat().map((date) => {
        const entry = byDate.get(date);
        const outside = date > today || date < start;
        return (
          <span
            key={date}
            className={`${styles.cell} ${entry ? styles.cellOn : ""} ${outside ? styles.cellOut : ""}`}
            data-kind={entry?.kind}
            title={entry ? `${date} ${KIND_LABEL[entry.kind]}` : date}
          />
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <ul className={styles.legend} aria-label="종류">
      {KINDS.map((kind) => (
        <li key={kind} className={styles.legendItem} data-kind={kind}>
          <span className={styles.legendDot} />
          {KIND_LABEL[kind]}
        </li>
      ))}
    </ul>
  );
}

/** 부위 균형. 네 고리의 채움은 가장 많이 한 부위 대비 비율. */
function Balance({ logs }: { logs: Entry[] }) {
  const counts = Object.fromEntries(PARTS.map((part) => [part, 0])) as Record<
    (typeof PARTS)[number],
    number
  >;
  for (const log of logs) for (const part of log.parts) counts[part] += 1;
  const max = Math.max(1, ...Object.values(counts));

  return (
    <ul className={styles.rings} aria-label="부위별 횟수">
      {PARTS.map((part) => {
        const ratio = counts[part] / max;
        return (
          <li key={part} className={styles.ring}>
            <svg viewBox="0 0 44 44" className={styles.ringSvg} aria-hidden="true">
              <circle className={styles.ringTrack} cx="22" cy="22" r={RING_RADIUS} />
              <circle
                className={styles.ringFill}
                cx="22"
                cy="22"
                r={RING_RADIUS}
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - ratio)}
              />
            </svg>
            <span className={styles.ringValue}>{counts[part]}</span>
            <span className={styles.ringLabel}>{PART_LABEL[part]}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Flow({
  userId,
  onExpired,
  nav,
}: {
  userId: string;
  onExpired: () => void;
  nav: ReactNode;
}) {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(userId, DAYS)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof UnknownUserError) {
          onExpired();
          return;
        }
        setError("흐름을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, onExpired]);

  const byDate: ByDate = new Map(
    (history?.logs ?? []).map((log) => [log.loggedOn, log]),
  );
  const weekLogs = history
    ? history.logs.filter((log) => log.loggedOn >= shiftDate(history.today, -6))
    : [];

  return (
    <Canvas top header={<LoggerHeader progress={null} />} nav={nav}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {history ? (
        <>
          <Question>{history.week.text}</Question>
          <Section title="이번 주">
            <WeekStrip today={history.today} byDate={byDate} />
          </Section>
          <Section title={`최근 ${WEEKS}주`}>
            <Heatmap today={history.today} byDate={byDate} />
            <Legend />
          </Section>
          <Section title="부위 균형">
            <Balance logs={history.logs.filter((log) => log.kind === "gym")} />
          </Section>
          {weekLogs.length === 0 ? null : (
            <p className={styles.footnote}>
              이번 주 {weekLogs.length}일 기록했어요
            </p>
          )}
        </>
      ) : null}
    </Canvas>
  );
}
