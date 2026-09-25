import { useCallback, useEffect, useState } from "react";
import {
  fetchToday,
  UnknownUserError,
  writeLog,
  type LogVia,
  type Settings,
} from "../api.ts";
import {
  wantsIntensity,
  type Entry,
  type Intensity,
  type Kind,
  type Part,
} from "../domain.ts";

/**
 * loading   오늘 상태를 받는 중
 * confirm   예측이 있다. "오늘도 이렇게?" 한 번만 누르면 끝
 * kind      종류 고르기. 쉼과 가볍게는 여기서 끝
 * part      헬스 부위. 여러 개 고르고 "다음"
 * intensity 헬스와 유산소 강도
 * done      오늘 기록이 있다
 */
export type Step = "loading" | "confirm" | "kind" | "part" | "intensity" | "done";

type Args = { userId: string; onExpired: () => void };

export function useLoggerFlow({ userId, onExpired }: Args) {
  const [step, setStep] = useState<Step>("loading");
  const [kind, setKind] = useState<Kind | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [prediction, setPrediction] = useState<Entry | null>(null);
  const [saved, setSaved] = useState<Entry | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (cause: unknown, message: string) => {
      if (cause instanceof UnknownUserError) {
        onExpired();
        return;
      }
      setError(message);
    },
    [onExpired],
  );

  // 오늘 기록이 있으면 done, 예측이 있으면 confirm, 아니면 kind 부터.
  useEffect(() => {
    let cancelled = false;
    fetchToday(userId)
      .then((today) => {
        if (cancelled) return;
        setSettings(today.settings);
        setPrediction(today.prediction);
        if (today.log) {
          setSaved(today.log);
          setStep("done");
          return;
        }
        setStep(today.prediction ? "confirm" : "kind");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setStep("kind");
        fail(cause, "오늘 기록을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, fail]);

  const save = useCallback(
    async (entry: Entry, via: LogVia) => {
      setError(null);
      try {
        const result = await writeLog({ userId, ...entry, via });
        setSaved(result.log);
        setStep("done");
      } catch (cause) {
        fail(cause, "저장하지 못했어요. 다시 눌러주세요");
      }
    },
    [userId, fail],
  );

  const handleAcceptClick = () => {
    if (prediction) void save(prediction, "predict");
  };

  const handleDeclineClick = () => {
    setStep("kind");
  };

  const handleKindClick = (value: Kind) => {
    setKind(value);
    setParts([]);
    setError(null);
    if (value === "gym") {
      setStep("part");
      return;
    }
    if (wantsIntensity(value)) {
      setStep("intensity");
      return;
    }
    void save({ kind: value, parts: [], intensity: null }, "pick");
  };

  const handlePartToggle = (value: Part) => {
    setParts((current) =>
      current.includes(value)
        ? current.filter((part) => part !== value)
        : [...current, value],
    );
  };

  const handlePartsNextClick = () => {
    if (parts.length > 0) setStep("intensity");
  };

  const handleIntensityClick = (value: Intensity) => {
    if (!kind) return;
    void save({ kind, parts, intensity: value }, "pick");
  };

  const handleAgainClick = () => {
    setStep("kind");
    setKind(null);
    setParts([]);
    setError(null);
  };

  return {
    step,
    kind,
    parts,
    prediction,
    saved,
    settings,
    error,
    handleAcceptClick,
    handleDeclineClick,
    handleKindClick,
    handlePartToggle,
    handlePartsNextClick,
    handleIntensityClick,
    handleAgainClick,
  };
}
