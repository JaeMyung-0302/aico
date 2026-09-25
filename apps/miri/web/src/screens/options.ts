import type { Choice as GridChoice } from "../components/ChoiceGrid.tsx";
import {
  NOTIFY_PRESETS,
  type Answer,
  type StepDef,
  type TrackDef,
} from "../domain.ts";

/** 프리셋 시각의 이름. 직접 고른 시각은 오전/오후로 읽는다. */
export const PRESET_LABEL: Record<string, string> = {
  "07:30": "아침",
  "12:30": "점심",
  "18:30": "저녁",
  "21:00": "밤",
};

export function isPreset(time: string): boolean {
  return (NOTIFY_PRESETS as readonly string[]).includes(time);
}

/** "밤 9시", "아침 7시 30분", "오후 3시 40분" 처럼 말로 읽는 시각. */
export function describeTime(time: string): string {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const period = PRESET_LABEL[time] ?? (hours < 12 ? "오전" : "오후");
  const hour12 = ((hours + 11) % 12) + 1;
  const minute = minutes ? ` ${minutes}분` : "";
  return `${period} ${hour12}시${minute}`;
}

/** 단계의 선택지를 타일용으로. toneFrom 이 있으면 이전 답의 색조를 물려받는다. */
export function choicesFor(
  track: TrackDef,
  step: StepDef,
  answer: Answer,
): GridChoice<string>[] {
  const from = step.toneFrom
    ? track.steps.find((item) => item.key === step.toneFrom)
    : undefined;
  const fromValue = step.toneFrom ? answer[step.toneFrom] : undefined;
  const inherited =
    from && typeof fromValue === "string"
      ? from.choices.find((choice) => choice.value === fromValue)?.tone
      : undefined;

  return step.choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    tone: choice.tone ?? inherited,
    level: choice.level,
  }));
}
