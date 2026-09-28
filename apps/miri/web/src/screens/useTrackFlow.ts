import { useCallback, useEffect, useMemo, useState } from "react";
import {
  UnknownUserError,
  writeLog,
  type LogVia,
  type SavedLog,
  type TodayTrack,
} from "../api.ts";
import {
  isChoiceStep,
  isStepActive,
  TRACKS,
  type Answer,
  type ChoiceStepDef,
  type StepDef,
  type TrackId,
} from "../domain.ts";

/**
 * confirm  예측이 있다. "오늘도 이렇게?" 한 번만 누르면 끝
 * pick     트랙 정의의 단계를 차례로. 단일 선택은 누르면 다음, 복수 선택은 "다음"으로
 * done     오늘 기록이 있다
 */
export type Phase = "confirm" | "pick" | "done";

type Args = {
  userId: string;
  trackId: TrackId;
  today: TodayTrack;
  onExpired: () => void;
  onSaved: (track: TrackId, saved: SavedLog) => void;
};

function initialPhase(today: TodayTrack): Phase {
  if (today.log) return "done";
  return today.prediction ? "confirm" : "pick";
}

export function useTrackFlow({ userId, trackId, today, onExpired, onSaved }: Args) {
  const track = TRACKS[trackId];
  const [phase, setPhase] = useState<Phase>(() => initialPhase(today));
  const [answer, setAnswer] = useState<Answer>({});
  const [committed, setCommitted] = useState<string[]>([]);
  const [saved, setSaved] = useState<Answer | null>(today.log);
  const [weekDays, setWeekDays] = useState(today.weekDays);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 트랙이 바뀌면 처음부터.
  useEffect(() => {
    setPhase(initialPhase(today));
    setAnswer({});
    setCommitted([]);
    setSaved(today.log);
    setWeekDays(today.weekDays);
    setError(null);
  }, [trackId, today]);

  /** 지금 답 기준으로 물어야 할 단계들. 조건부 단계는 앞 답이 정해져야 나타난다. */
  const activeSteps = useMemo(
    () => track.steps.filter((step) => isStepActive(step, answer)),
    [track, answer],
  );
  const current: StepDef | null =
    activeSteps.find((step) => !committed.includes(step.key)) ?? null;

  const save = useCallback(
    async (value: Answer, via: LogVia) => {
      setBusy(true);
      setError(null);
      try {
        const result = await writeLog({ userId, track: trackId, answer: value, via });
        setSaved(result.answer);
        setWeekDays(result.weekDays);
        setPhase("done");
        onSaved(trackId, {
          answer: result.answer,
          feedback: result.feedback,
          weekDays: result.weekDays,
        });
      } catch (cause) {
        if (cause instanceof UnknownUserError) {
          onExpired();
          return;
        }
        setError("저장하지 못했어요. 다시 눌러주세요");
      } finally {
        setBusy(false);
      }
    },
    [userId, trackId, onExpired, onSaved],
  );

  // 물을 단계가 더 없으면 저장한다. 조건부 단계가 사라지는 경우도 여기서 정리된다.
  useEffect(() => {
    if (phase !== "pick" || busy || current || committed.length === 0) return;
    const trimmed: Answer = {};
    for (const step of activeSteps) {
      const value = answer[step.key];
      if (value !== undefined) trimmed[step.key] = value;
    }
    void save(trimmed, "pick");
  }, [phase, busy, current, committed, activeSteps, answer, save]);

  const handleAcceptClick = () => {
    if (today.prediction) void save(today.prediction, "predict");
  };

  const handleDeclineClick = () => setPhase("pick");

  const handlePick = (step: ChoiceStepDef, value: string) => {
    setError(null);
    if (step.multi) {
      setAnswer((prev) => {
        const list = Array.isArray(prev[step.key]) ? (prev[step.key] as string[]) : [];
        const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
        return { ...prev, [step.key]: next };
      });
      return;
    }
    // 앞 단계를 다시 고르면 뒤 단계 답은 버린다.
    const index = track.steps.findIndex((item) => item.key === step.key);
    const later = track.steps.slice(index + 1).map((item) => item.key);
    setAnswer((prev) => {
      const next: Answer = {};
      for (const [key, v] of Object.entries(prev)) if (!later.includes(key)) next[key] = v;
      next[step.key] = value;
      return next;
    });
    setCommitted((prev) => [...prev.filter((key) => !later.includes(key)), step.key]);
  };

  const handleNextClick = () => {
    if (!current || !isChoiceStep(current) || !current.multi) return;
    const list = answer[current.key];
    if (!Array.isArray(list) || list.length === 0) return;
    setCommitted((prev) => [...prev, current.key]);
  };

  const handleAgainClick = () => {
    setAnswer({});
    setCommitted([]);
    setError(null);
    setPhase("pick");
  };

  const selectedOf = (step: StepDef): string[] => {
    const value = answer[step.key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  };

  return {
    track,
    phase,
    answer,
    current,
    activeSteps,
    progress: current
      ? { current: activeSteps.indexOf(current), total: activeSteps.length }
      : null,
    saved,
    weekDays,
    error,
    busy,
    selectedOf,
    handleAcceptClick,
    handleDeclineClick,
    handlePick,
    handleNextClick,
    handleAgainClick,
  };
}
