import { useEffect, useState, type ReactNode } from "react";
import {
  fetchHistory,
  fetchMe,
  UnknownUserError,
  type History,
} from "../api.ts";
import Canvas from "../components/Canvas.tsx";
import { LoggerHeader } from "../components/Header.tsx";
import { ErrorNote, Question } from "../components/Prompt.tsx";
import LiftTrend from "../components/LiftTrend.tsx";
import Skeleton from "../components/Skeleton.tsx";
import { shiftDate, weekdayOf } from "../dates.ts";
import {
  isChoiceStep,
  primaryStep,
  toneOf,
  TRACKS,
  type Answer,
  type ChoiceStepDef,
  type TrackDef,
  type TrackId,
} from "../domain.ts";
import styles from "./Flow.module.scss";

const DAYS = 35;
const WEEKS = DAYS / 7;
const WEEKDAY_LABELS_MON = ["월", "화", "수", "목", "금", "토", "일"];

type ByDate = Map<string, Answer>;

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

function labelOf(step: ChoiceStepDef, value: string): string {
  return step.choices.find((choice) => choice.value === value)?.label ?? value;
}

function titleOf(track: TrackDef, date: string, answer: Answer | undefined): string {
  if (!answer) return date;
  const primary = primaryStep(track);
  const value = answer[track.primary];
  return primary && typeof value === "string" ? `${date} ${labelOf(primary, value)}` : date;
}

/** 이번 주 7칸. 답의 색점, 오늘은 고리. */
function WeekStrip({ track, today, byDate }: { track: TrackDef; today: string; byDate: ByDate }) {
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6));
  return (
    <ol className={styles.strip} aria-label="최근 7일">
      {days.map((date) => {
        const answer = byDate.get(date);
        const label = WEEKDAY_LABELS_MON[(weekdayOf(date) + 6) % 7];
        return (
          <li key={date} className={styles.day}>
            <span className={styles.dayLabel}>{label}</span>
            <span
              className={`${styles.dot} ${answer ? styles.dotOn : ""} ${date === today ? styles.today : ""}`}
              data-tone={answer ? toneOf(track, answer) ?? undefined : undefined}
              title={titleOf(track, date, answer)}
            />
          </li>
        );
      })}
    </ol>
  );
}

/** 5주 히트맵. 색은 첫 단계 답(정체성), 빈 칸은 기록 없음. 범례가 항상 함께 있다. */
function Heatmap({ track, today, byDate }: { track: TrackDef; today: string; byDate: ByDate }) {
  const weeks = buildWeeks(today, DAYS);
  const start = shiftDate(today, -(DAYS - 1));
  return (
    <div className={styles.heat} role="img" aria-label={`최근 ${DAYS}일 기록`}>
      {weeks.flat().map((date) => {
        const answer = byDate.get(date);
        const outside = date > today || date < start;
        return (
          <span
            key={date}
            className={`${styles.cell} ${answer ? styles.cellOn : ""} ${outside ? styles.cellOut : ""}`}
            data-tone={answer ? toneOf(track, answer) ?? undefined : undefined}
            title={titleOf(track, date, answer)}
          />
        );
      })}
    </div>
  );
}

function Legend({ track }: { track: TrackDef }) {
  const primary = primaryStep(track);
  if (!primary) return null;
  return (
    <ul className={styles.legend} aria-label={primary.question}>
      {primary.choices.map((choice) => (
        <li key={choice.value} className={styles.legendItem} data-tone={choice.tone}>
          <span className={styles.legendDot} />
          {choice.label}
        </li>
      ))}
    </ul>
  );
}

/** 단계별 분포. 각 선택지가 몇 번이었는지 막대로. 가장 많은 것 대비 길이. */
function Distribution({ track, answers }: { track: TrackDef; answers: Answer[] }) {
  return (
    <div className={styles.dist}>
      {/* 선택지 단계만 분포가 있다. 수와 묶음 단계는 그 트랙의 화면에서 따로 그린다. */}
      {track.steps.filter(isChoiceStep).map((step) => {
        const counts = new Map<string, number>(step.choices.map((choice) => [choice.value, 0]));
        for (const answer of answers) {
          const value = answer[step.key];
          const values = Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string")
            : typeof value === "string"
              ? [value]
              : [];
          for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        const max = Math.max(1, ...counts.values());
        const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
        if (total === 0) return null;
        return (
          <div key={step.key} className={styles.distStep}>
            <span className={styles.distTitle}>{step.question}</span>
            <ul className={styles.bars} aria-label={step.question}>
              {step.choices.map((choice) => {
                const count = counts.get(choice.value) ?? 0;
                return (
                  <li key={choice.value} className={styles.bar}>
                    <span className={styles.barLabel}>{choice.label}</span>
                    <span className={styles.barTrack}>
                      <span
                        className={styles.barFill}
                        data-tone={choice.tone}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </span>
                    <span className={styles.barValue}>{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TrackTabs({
  tracks,
  current,
  onChange,
}: {
  tracks: TrackId[];
  current: TrackId;
  onChange: (track: TrackId) => void;
}) {
  if (tracks.length < 2) return null;
  return (
    <div className={styles.tabs} role="tablist" aria-label="분야">
      {tracks.map((track) => (
        <button
          key={track}
          type="button"
          role="tab"
          aria-selected={track === current}
          className={`${styles.tab} ${track === current ? styles.tabOn : ""}`}
          onClick={() => onChange(track)}
        >
          {TRACKS[track].name}
        </button>
      ))}
    </div>
  );
}

/** 묶음(종목 줄) 기록이 하나라도 있는가. 없으면 추이 영역을 통째로 숨긴다. */
function hasEntries(track: TrackDef, history: History): boolean {
  const step = track.steps.find((item) => item.kind === "entries");
  if (!step) return false;
  return history.logs.some((log) => {
    const value = log.answer[step.key];
    return Array.isArray(value) && value.length > 0;
  });
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
  const [tracks, setTracks] = useState<TrackId[]>([]);
  const [current, setCurrent] = useState<TrackId | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMe(userId)
      .then((me) => {
        if (cancelled) return;
        const enabled = me.tracks.filter((item) => item.enabled).map((item) => item.track);
        setMeLoaded(true);
        setTracks(enabled);
        setCurrent((chosen) => chosen ?? enabled[0] ?? null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof UnknownUserError) onExpired();
        else setError("흐름을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, onExpired]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setHistory(null);
    fetchHistory(userId, current, DAYS)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof UnknownUserError) onExpired();
        else setError("흐름을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, current, onExpired]);

  const track = current ? TRACKS[current] : null;
  const byDate: ByDate = new Map((history?.logs ?? []).map((log) => [log.loggedOn, log.answer]));

  return (
    <Canvas top header={<LoggerHeader progress={null} />} nav={nav}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {current ? <TrackTabs tracks={tracks} current={current} onChange={setCurrent} /> : null}
      {!history && !error && (current !== null || !meLoaded) ? <Skeleton variant="flow" /> : null}
      {history && track ? (
        <>
          <Question>{history.weekText}</Question>
          <Section title="이번 주">
            <WeekStrip track={track} today={history.today} byDate={byDate} />
          </Section>
          {hasEntries(track, history) ? (
            <Section title="종목 추이">
              <LiftTrend key={track.id} track={track} logs={history.logs} />
            </Section>
          ) : null}
          <Section title={`최근 ${WEEKS}주`}>
            <Heatmap track={track} today={history.today} byDate={byDate} />
            <Legend track={track} />
          </Section>
          <Section title="분포">
            <Distribution track={track} answers={history.logs.map((log) => log.answer)} />
          </Section>
        </>
      ) : null}
    </Canvas>
  );
}
