import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  fetchToday,
  UnknownUserError,
  type SavedLog,
  type Today as TodayData,
  type TodayTrack,
} from "../api.ts";
import Button from "../components/Button.tsx";
import Canvas from "../components/Canvas.tsx";
import ChoiceGrid from "../components/ChoiceGrid.tsx";
import { LoggerHeader, Wordmark } from "../components/Header.tsx";
import Orb from "../components/Orb.tsx";
import {
  AnswerChips,
  Confirm,
  ErrorNote,
  Question,
  Trace,
} from "../components/Prompt.tsx";
import StepStage from "../components/StepStage.tsx";
import {
  describeValue,
  isChoiceStep,
  TRACKS,
  type TrackId,
} from "../domain.ts";
import { choicesFor, describeTime } from "./options.ts";
import styles from "./Today.module.scss";
import { useTrackFlow } from "./useTrackFlow.ts";

type Flow = ReturnType<typeof useTrackFlow>;

/** 켜진 트랙이 둘 이상일 때만 보이는 트랙 칩. 기록한 트랙은 점이 찍힌다. */
function TrackTabs({
  tracks,
  current,
  onChange,
}: {
  tracks: TodayTrack[];
  current: TrackId;
  onChange: (track: TrackId) => void;
}) {
  if (tracks.length < 2) return null;
  return (
    <div className={styles.tabs} role="tablist" aria-label="오늘 기록할 것">
      {tracks.map((item) => (
        <button
          key={item.track}
          type="button"
          role="tab"
          aria-selected={item.track === current}
          className={`${styles.tab} ${item.track === current ? styles.tabOn : ""} ${item.log ? styles.tabDone : ""}`}
          onClick={() => onChange(item.track)}
        >
          {TRACKS[item.track].name}
        </button>
      ))}
    </div>
  );
}

function ConfirmScreen({
  flow,
  today,
  nav,
  tabs,
}: {
  flow: Flow;
  today: TodayTrack;
  nav: ReactNode;
  tabs: ReactNode;
}) {
  if (!today.prediction) return null;
  return (
    <Canvas
      header={<LoggerHeader progress={null} mood="asking" />}
      nav={nav}
      dock={
        <>
          {flow.error ? <ErrorNote>{flow.error}</ErrorNote> : null}
          <Button onClick={flow.handleAcceptClick} disabled={flow.busy} busy={flow.busy}>
            그래요
          </Button>
          <Button variant="ghost" onClick={flow.handleDeclineClick} disabled={flow.busy}>
            다르게 골라요
          </Button>
        </>
      }
    >
      {tabs}
      <StepStage stepKey={`confirm-${flow.track.id}`}>
        <Trace items={[flow.track.name, "지난 같은 요일처럼"]} />
        <Question>{today.questionText ?? "오늘도 이렇게?"}</Question>
        <AnswerChips track={flow.track} answer={today.prediction} />
      </StepStage>
    </Canvas>
  );
}

function DoneScreen({
  flow,
  today,
  paused,
  nextTrack,
  nav,
  tabs,
  onNext,
}: {
  flow: Flow;
  today: TodayTrack;
  paused: boolean;
  nextTrack: TrackId | null;
  nav: ReactNode;
  tabs: ReactNode;
  onNext: (track: TrackId) => void;
}) {
  const sub = paused
    ? "알림은 잠시 멈춰 있어요"
    : `내일 ${describeTime(today.notifyAt)}에 다시 물어볼게요`;

  return (
    <Canvas
      lit
      header={<Wordmark />}
      nav={nav}
      dock={
        nextTrack ? (
          <Button onClick={() => onNext(nextTrack)}>
            다음: {TRACKS[nextTrack].name}
          </Button>
        ) : (
          <Button variant="ghost" onClick={flow.handleAgainClick}>
            다시 고르기
          </Button>
        )
      }
    >
      {tabs}
      <Orb size="lg" mood="done" />
      <Confirm title={`${flow.track.name} 기록했어요`} sub={sub} />
      {flow.saved ? <AnswerChips track={flow.track} answer={flow.saved} /> : null}
      {today.feedback ? <p className={styles.feedback}>{today.feedback}</p> : null}
      {flow.weekDays > 0 ? (
        <p className={styles.streak}>이번 주 {flow.weekDays}일째</p>
      ) : null}
    </Canvas>
  );
}

/** 질문 영역. 고른 경로(trace)와 현재 질문이 같은 무대 위에서 교체된다. */
function QuestionStage({ flow }: { flow: Flow }) {
  const step = flow.current;
  if (!step) return null;
  const trace = [flow.track.name];
  for (const item of flow.activeSteps) {
    if (item.key === step.key) break;
    const value = flow.answer[item.key];
    if (value !== undefined) trace.push(describeValue(item, value));
  }

  return (
    <StepStage stepKey={`${flow.track.id}-${step.key}`}>
      <Trace items={trace} />
      <div aria-live="polite">
        <Question>{step.question}</Question>
      </div>
    </StepStage>
  );
}

/** 하단 도크. 에러 한 줄 + 현재 단계 선택지. 복수 선택은 "다음". */
function ChoiceDock({ flow }: { flow: Flow }) {
  const step = flow.current;
  // 수와 묶음 단계의 입력 화면은 그 단계를 쓰는 트랙과 함께 붙인다.
  if (!step || !isChoiceStep(step)) return null;
  const selected = step.multi ? flow.selectedOf(step) : undefined;
  return (
    <>
      {flow.error ? <ErrorNote>{flow.error}</ErrorNote> : null}
      <StepStage stepKey={`${flow.track.id}-${step.key}-choices`}>
        <ChoiceGrid
          label={step.question}
          choices={choicesFor(flow.track, step, flow.answer)}
          columns={step.columns}
          selected={selected}
          onPick={(value) => flow.handlePick(step, value)}
        />
        {step.multi ? (
          <Button
            onClick={flow.handleNextClick}
            disabled={!selected || selected.length === 0 || flow.busy}
          >
            {!selected || selected.length === 0 ? "골라주세요" : "다음"}
          </Button>
        ) : null}
      </StepStage>
    </>
  );
}

function TrackScreen({
  userId,
  today,
  paused,
  nextTrack,
  nav,
  tabs,
  onExpired,
  onSaved,
  onNext,
}: {
  userId: string;
  today: TodayTrack;
  paused: boolean;
  nextTrack: TrackId | null;
  nav: ReactNode;
  tabs: ReactNode;
  onExpired: () => void;
  onSaved: (track: TrackId, saved: SavedLog) => void;
  onNext: (track: TrackId) => void;
}) {
  const flow = useTrackFlow({ userId, trackId: today.track, today, onExpired, onSaved });

  if (flow.phase === "confirm") {
    return <ConfirmScreen flow={flow} today={today} nav={nav} tabs={tabs} />;
  }
  if (flow.phase === "done") {
    return (
      <DoneScreen
        flow={flow}
        today={today}
        paused={paused}
        nextTrack={nextTrack}
        nav={nav}
        tabs={tabs}
        onNext={onNext}
      />
    );
  }
  // 단계가 하나뿐이면 진행점은 의미가 없다. 조건부 단계가 열리면 그때 나타난다.
  const progress = flow.progress && flow.progress.total > 1 ? flow.progress : null;
  return (
    <Canvas
      header={<LoggerHeader progress={progress} />}
      nav={nav}
      dock={<ChoiceDock flow={flow} />}
    >
      {tabs}
      <QuestionStage flow={flow} />
    </Canvas>
  );
}

/** 오늘 화면. 켜진 트랙을 차례로 묻는다. 알림에서 온 트랙이 있으면 그것부터. */
export default function Today({
  userId,
  initialTrack,
  onExpired,
  nav,
}: {
  userId: string;
  initialTrack: TrackId | null;
  onExpired: () => void;
  nav: ReactNode;
}) {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<TrackId | null>(initialTrack);

  useEffect(() => {
    let cancelled = false;
    fetchToday(userId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setCurrent((chosen) => {
          const enabled = result.tracks.map((item) => item.track);
          if (chosen && enabled.includes(chosen)) return chosen;
          const pending = result.tracks.find((item) => !item.log);
          return pending?.track ?? enabled[0] ?? null;
        });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof UnknownUserError) {
          onExpired();
          return;
        }
        setError("오늘 기록을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, onExpired]);

  const handleSaved = useCallback((track: TrackId, saved: SavedLog) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            tracks: prev.tracks.map((item) =>
              item.track === track
                ? { ...item, log: saved.answer, feedback: saved.feedback, weekDays: saved.weekDays }
                : item,
            ),
          }
        : prev,
    );
  }, []);

  if (!data || !current) {
    return (
      <Canvas header={<LoggerHeader progress={null} />} nav={nav}>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {data && data.tracks.length === 0 ? (
          <>
            <Question>켜진 기록이 없어요</Question>
            <p className={styles.streak}>설정에서 물어볼 것을 골라주세요</p>
          </>
        ) : null}
      </Canvas>
    );
  }

  const today = data.tracks.find((item) => item.track === current) ?? data.tracks[0];
  if (!today) return null;
  const nextTrack =
    data.tracks.find((item) => item.track !== today.track && !item.log)?.track ?? null;
  const tabs = <TrackTabs tracks={data.tracks} current={today.track} onChange={setCurrent} />;

  return (
    <TrackScreen
      key={today.track}
      userId={userId}
      today={today}
      paused={data.paused}
      nextTrack={nextTrack}
      nav={nav}
      tabs={tabs}
      onExpired={onExpired}
      onSaved={handleSaved}
      onNext={setCurrent}
    />
  );
}
