import { useCallback, useEffect, useMemo, useState } from "react";
import {
  refineFeedback,
  UnknownUserError,
  writeLog,
  type LogVia,
  type SavedLog,
  type TodayTrack,
} from "../api.ts";
import {
  cleanCustomName,
  customValue,
  isStepActive,
  TRACKS,
  type Answer,
  type ChoiceStepDef,
  type EntriesStepDef,
  type Entry,
  type NumberStepDef,
  type StepDef,
  type TrackId,
} from "../domain.ts";

function isEntry(value: unknown): value is Entry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * confirm  예측이 있다. "오늘도 이렇게?" 한 번만 누르면 끝
 * pick     트랙 정의의 단계를 차례로. 단일 선택은 누르면 다음, 복수 선택과 수와 묶음은 "다음"으로
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
  /** 저장은 끝났고 미리가 한마디를 다듬는 중. 완료 화면이 이 동안 생각 중 표시를 띄운다. */
  const [thinking, setThinking] = useState(false);

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

  /** 지금 화면에 함께 묻는 단계들. screen 이 같은 이웃 단계는 한 화면에서 받는다. */
  const screenSteps: StepDef[] = useMemo(() => {
    if (!current) return [];
    if (!current.screen) return [current];
    return activeSteps.filter((step) => step.screen === current.screen && !committed.includes(step.key));
  }, [current, activeSteps, committed]);

  /** 진행점은 단계가 아니라 화면 수로 센다. */
  const screens = useMemo(() => {
    const keys: string[] = [];
    for (const step of activeSteps) {
      const key = step.screen ?? step.key;
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }, [activeSteps]);

  const save = useCallback(
    async (value: Answer, via: LogVia) => {
      setBusy(true);
      setError(null);
      try {
        const result = await writeLog({ userId, track: trackId, answer: value, via });
        setSaved(result.answer);
        setWeekDays(result.weekDays);
        setPhase("done");
        const saved = { answer: result.answer, feedback: result.feedback, weekDays: result.weekDays };
        onSaved(trackId, saved);
        if (result.feedbackPending) {
          // 저장은 이미 끝났다. 다듬은 문장이 오면 그 자리만 바꾸고, 실패하면 규칙 문장이 남는다.
          setThinking(true);
          refineFeedback(userId, trackId)
            .then(({ feedback }) => onSaved(trackId, { ...saved, feedback: feedback ?? saved.feedback }))
            .catch(() => undefined)
            .finally(() => setThinking(false));
        }
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

  // 다르게 고를 때도 예측에서 출발한다. 무게 하나만 바꾸려는 사람이 처음부터 다시 고르지 않게.
  const handleDeclineClick = () => {
    setAnswer(today.prediction ?? {});
    setCommitted([]);
    setPhase("pick");
  };

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
    // 같은 값을 다시 고르면 뒤 단계 답(예측에서 채운 것 포함)을 그대로 둔다.
    if (answer[step.key] === value) {
      setCommitted((prev) => [...prev.filter((key) => key !== step.key), step.key]);
      return;
    }
    // 다른 값을 고르면 뒤 단계 답은 버린다.
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

  const numberOf = (step: NumberStepDef): number => {
    const value = answer[step.key];
    return typeof value === "number" ? value : (step.initial ?? step.min);
  };

  const entriesOf = (step: EntriesStepDef): Entry[] => {
    const value = answer[step.key];
    return Array.isArray(value) ? value.filter(isEntry) : [];
  };

  const handleNumberChange = (step: NumberStepDef, value: number) => {
    setError(null);
    setAnswer((prev) => ({ ...prev, [step.key]: value }));
  };

  /**
   * 첫 칸(종목)을 고르면 줄을 하나 더한다. 예측(지난 같은 루틴)에 그 종목이 있으면
   * 그날의 줄을 전부 가져오고, 없으면 기본값 한 줄로 시작한다.
   */
  const handleEntryAdd = (step: EntriesStepDef, value: string) => {
    setError(null);
    const head = step.fields.find((field) => field.kind === "choice");
    const past = head && Array.isArray(today.prediction?.[step.key])
      ? (today.prediction[step.key] as unknown[]).filter(isEntry).filter((entry) => entry[head.key] === value)
      : [];
    const fresh: Entry = {};
    for (const field of step.fields) {
      fresh[field.key] = field.kind === "choice" ? value : (field.initial ?? field.min);
    }
    const added = past.length > 0 ? past.map((entry) => ({ ...entry })) : [fresh];
    setAnswer((prev) => {
      const list = Array.isArray(prev[step.key]) ? (prev[step.key] as unknown[]).filter(isEntry) : [];
      return { ...prev, [step.key]: [...list, ...added].slice(0, step.maxEntries) };
    });
  };

  /** 같은 종목 아래 한 줄 더. 그 종목의 마지막 줄을 바탕으로 채워 바로 뒤에 넣는다. */
  const handleEntryAddRow = (step: EntriesStepDef, value: string) => {
    setError(null);
    const head = step.fields.find((field) => field.kind === "choice");
    if (!head) return;
    setAnswer((prev) => {
      const list = Array.isArray(prev[step.key]) ? (prev[step.key] as unknown[]).filter(isEntry) : [];
      if (list.length >= step.maxEntries) return prev;
      const last = list.map((entry) => entry[head.key]).lastIndexOf(value);
      if (last < 0) return prev;
      const base = list[last] as Entry;
      const next = step.nextEntry ? step.nextEntry(base) : { ...base };
      return { ...prev, [step.key]: [...list.slice(0, last + 1), next, ...list.slice(last + 1)] };
    });
  };

  /** 한 종목의 줄을 전부 뺀다. */
  const handleEntryRemoveAll = (step: EntriesStepDef, value: string) => {
    const head = step.fields.find((field) => field.kind === "choice");
    if (!head) return;
    setAnswer((prev) => {
      const list = Array.isArray(prev[step.key]) ? (prev[step.key] as unknown[]).filter(isEntry) : [];
      return { ...prev, [step.key]: list.filter((entry) => entry[head.key] !== value) };
    });
  };

  const handleEntryChange = (step: EntriesStepDef, index: number, key: string, value: number) => {
    setAnswer((prev) => {
      const list = Array.isArray(prev[step.key]) ? (prev[step.key] as unknown[]).filter(isEntry) : [];
      return { ...prev, [step.key]: list.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)) };
    });
  };

  const handleEntryRemove = (step: EntriesStepDef, index: number) => {
    setAnswer((prev) => {
      const list = Array.isArray(prev[step.key]) ? (prev[step.key] as unknown[]).filter(isEntry) : [];
      return { ...prev, [step.key]: list.filter((_, i) => i !== index) };
    });
  };

  /**
   * 직접 이름을 적어 종목을 더한다. 이름은 한 번만 적고, 다음부터는 칩으로 나온다.
   * 규칙에 안 맞으면(빈 이름, 너무 김) false 를 돌려 입력창이 그대로 남게 한다.
   */
  const handleEntryAddCustom = (step: EntriesStepDef, group: string, name: string): boolean => {
    const head = step.fields.find((field) => field.kind === "choice");
    const clean = cleanCustomName(name);
    if (!head || head.kind !== "choice" || !head.custom) return false;
    if (clean.length === 0 || clean.length > head.custom.maxLength) return false;
    handleEntryAdd(step, customValue(group, clean));
    return true;
  };

  /** "다음"을 누를 수 있는가. 단일 선택은 누르는 순간 넘어가므로 해당 없음. */
  const canAdvance = (step: StepDef): boolean => {
    if (step.kind === "number") return true;
    if (step.kind === "entries") return entriesOf(step).length > 0;
    return step.multi === true && selectedOf(step).length > 0;
  };

  const handleNextClick = () => {
    if (!current || !screenSteps.every(canAdvance)) return;
    // 수 단계는 한 번도 안 건드렸으면 보이던 기본값을 답으로 적는다.
    const defaults: Answer = {};
    for (const step of screenSteps) {
      if (step.kind === "number" && typeof answer[step.key] !== "number") defaults[step.key] = numberOf(step);
    }
    if (Object.keys(defaults).length > 0) setAnswer((prev) => ({ ...prev, ...defaults }));
    setCommitted((prev) => [...prev, ...screenSteps.map((step) => step.key)]);
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
    screenSteps,
    thinking,
    progress: current
      ? { current: screens.indexOf(current.screen ?? current.key), total: screens.length }
      : null,
    saved,
    weekDays,
    error,
    busy,
    selectedOf,
    numberOf,
    entriesOf,
    canAdvance,
    handleAcceptClick,
    handleDeclineClick,
    handlePick,
    handleNextClick,
    handleNumberChange,
    handleEntryAdd,
    handleEntryAddRow,
    handleEntryAddCustom,
    handleEntryChange,
    handleEntryRemove,
    handleEntryRemoveAll,
    handleAgainClick,
  };
}
