import { useMemo, useState, type PointerEvent } from "react";
import type { HistoryLog } from "../api.ts";
import {
  describeNumber,
  parseCustom,
  type EntriesStepDef,
  type EntryField,
  type TrackDef,
} from "../domain.ts";
import styles from "./LiftTrend.module.scss";

type ChoiceField = Extract<EntryField, { kind: "choice" }>;
type NumberField = Extract<EntryField, { kind: "number" }>;

/** 한 날의 한 종목. 같은 날 여러 줄이면 가장 무거운 줄. */
type Point = { date: string; value: number; entry: Record<string, string | number> };

const W = 342;
const H = 208;
const PAD = { top: 16, right: 12, bottom: 28, left: 34 };

function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** 눈금 세 개. 값 범위를 보기 좋은 간격으로 감싼다. */
function ticks(min: number, max: number, step: number): number[] {
  const span = Math.max(max - min, step * 2);
  const raw = span / 2;
  const nice = Math.ceil(raw / step) * step;
  const low = Math.floor(min / step) * step;
  return [low, low + nice, low + nice * 2];
}

/**
 * 묶음 단계(운동의 종목 줄)에서 한 종목의 추이. 날마다 가장 무거운 줄의 첫 수 칸(무게)을 잇는다.
 * 모두 0 이면(맨몸) 대신 두 번째 수 칸(반복)을 본다. 한 계열이라 범례 없이 제목이 이름을 대신한다.
 */
export default function LiftTrend({ track, logs }: { track: TrackDef; logs: HistoryLog[] }) {
  const { step, head, numbers } = useMemo(() => {
    const found = track.steps.find((item): item is EntriesStepDef => item.kind === "entries");
    return {
      step: found,
      head: found?.fields.find((field): field is ChoiceField => field.kind === "choice"),
      numbers: found?.fields.filter((field): field is NumberField => field.kind === "number") ?? [],
    };
  }, [track]);

  /** 종목별 날짜순 점들. 가장 최근에 한 종목이 앞에 온다. */
  const series = useMemo(() => {
    const byLift = new Map<string, Point[]>();
    if (!step || !head || numbers.length === 0) return byLift;
    const primary = numbers[0] as NumberField;
    for (const log of logs) {
      const list = log.answer[step.key];
      if (!Array.isArray(list)) continue;
      const best = new Map<string, Record<string, string | number>>();
      for (const item of list) {
        if (typeof item !== "object") continue;
        const lift = String(item[head.key]);
        const prev = best.get(lift);
        if (!prev || Number(item[primary.key]) > Number(prev[primary.key])) best.set(lift, item);
      }
      for (const [lift, entry] of best) {
        const points = byLift.get(lift) ?? [];
        points.push({ date: log.loggedOn, value: Number(entry[primary.key]), entry });
        byLift.set(lift, points);
      }
    }
    return new Map(
      [...byLift.entries()].sort((a, b) => (b[1].at(-1)?.date ?? "").localeCompare(a[1].at(-1)?.date ?? "")),
    );
  }, [logs, step, head, numbers]);

  const lifts = [...series.keys()];
  const [chosen, setChosen] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  if (!step || !head || lifts.length === 0) return null;

  const lift = chosen && series.has(chosen) ? chosen : (lifts[0] as string);
  const labelOf = (value: string) =>
    head.choices.find((choice) => choice.value === value)?.label ?? parseCustom(value)?.name ?? value;

  // 맨몸 종목은 무게가 늘 0 이라 선이 평평하다. 그때는 반복을 본다.
  const allZero = (series.get(lift) ?? []).every((point) => point.value === 0);
  const metric = (allZero ? numbers[1] : numbers[0]) ?? (numbers[0] as NumberField);
  const points = (series.get(lift) ?? []).map((point) => ({ ...point, value: Number(point.entry[metric.key]) }));
  const latest = points.at(-1) as Point;
  const first = points[0] as Point;
  const delta = Number((latest.value - first.value).toFixed(3));
  const weeks = Math.max(1, Math.round(daysBetween(first.date, latest.date) / 7));

  const values = points.map((point) => point.value);
  const [low, mid, high] = ticks(Math.min(...values), Math.max(...values), metric.step * 4 || 1) as [number, number, number];
  const x = (index: number) =>
    points.length === 1 ? (PAD.left + W - PAD.right) / 2 : PAD.left + (index / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low || 1)) * (H - PAD.top - PAD.bottom);
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const describe = (entry: Record<string, string | number>) =>
    numbers.map((field) => describeNumber(field, Number(entry[field.key]))).join(" ");

  /** 손가락이나 커서에서 가장 가까운 점. 점보다 넓은 영역이 반응한다. */
  const handlePointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    for (let index = 1; index < points.length; index += 1) {
      if (Math.abs(x(index) - px) < Math.abs(x(nearest) - px)) nearest = index;
    }
    setHover(nearest);
  };

  const active = hover !== null ? points[hover] : null;
  const title = `${labelOf(lift)} ${allZero ? `최고 ${metric.label}` : "최고 무게"}`;
  const change =
    points.length === 1
      ? "첫 기록"
      : delta === 0
        ? `${weeks}주째 그대로`
        : `${weeks}주 전보다 ${delta > 0 ? "+" : "−"}${describeNumber(metric, Math.abs(delta))}`;

  return (
    <div className={styles.trend}>
      {lifts.length > 1 ? (
        <div className={styles.lifts} role="tablist" aria-label="종목">
          {lifts.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={value === lift}
              className={`${styles.lift} ${value === lift ? styles.liftOn : ""}`}
              onClick={() => {
                setChosen(value);
                setHover(null);
              }}
            >
              {labelOf(value)}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.hero}>
        <span className={styles.heroLabel}>{title}</span>
        <div className={styles.heroRow}>
          <strong className={styles.heroValue}>{describeNumber(metric, latest.value)}</strong>
          <span className={`${styles.heroChange} ${delta > 0 ? styles.up : ""}`}>{change}</span>
        </div>
      </div>

      <div className={styles.chart}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title}, ${shortDate(first.date)} ${describeNumber(metric, first.value)}에서 ${shortDate(latest.date)} ${describeNumber(metric, latest.value)}`}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHover(null)}
        >
          <g className={styles.grid}>
            {[low, mid, high].map((tick) => (
              <line key={tick} x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            ))}
          </g>
          <g className={styles.axis}>
            {[low, mid, high].map((tick) => (
              <text key={tick} x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
            ))}
            <text x={x(0)} y={H - 8} textAnchor={points.length === 1 ? "middle" : "start"}>
              {shortDate(first.date)}
            </text>
            {points.length > 1 ? (
              <text x={x(points.length - 1)} y={H - 8} textAnchor="end">
                {shortDate(latest.date)}
              </text>
            ) : null}
          </g>
          {active && hover !== null ? (
            <line className={styles.cross} x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
          ) : null}
          {points.length > 1 ? <polyline className={styles.line} points={line} /> : null}
          {points.map((point, index) => (
            <circle
              key={point.date}
              className={styles.point}
              cx={x(index)}
              cy={y(point.value)}
              r={index === points.length - 1 || index === hover ? 5 : 4}
            />
          ))}
        </svg>
        {active && hover !== null ? (
          <div
            className={styles.tooltip}
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(active.value) / H) * 100}%` }}
          >
            <span className={styles.tooltipDate}>{shortDate(active.date)}</span>
            <span className={styles.tooltipValue}>{describe(active.entry)}</span>
          </div>
        ) : null}
      </div>

      <ol className={styles.table} aria-label={`${labelOf(lift)} 최근 기록`}>
        {[...points]
          .reverse()
          .slice(0, 4)
          .map((point) => (
            <li key={point.date} className={styles.row}>
              <span>{shortDate(point.date)}</span>
              <span className={styles.rowValue}>{describe(point.entry)}</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
