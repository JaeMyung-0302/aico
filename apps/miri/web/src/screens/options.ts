import type { Choice } from "../components/ChoiceGrid.tsx";
import {
  INTENSITIES,
  INTENSITY_LABEL,
  KIND_LABEL,
  KINDS,
  PART_LABEL,
  PARTS,
  type Intensity,
  type Kind,
  type NotifySlot,
  type Part,
} from "../domain.ts";

/** 선택지는 domain 의 옵션에서만 만든다. 라벨을 여기서 새로 정하지 않는다. */

export const KIND_CHOICES: Choice<Kind>[] = KINDS.map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
  tone: kind,
}));

export const PART_CHOICES: Choice<Part>[] = PARTS.map((part) => ({
  value: part,
  label: PART_LABEL[part],
  tone: "gym",
}));

const LEVELS = [1, 2, 3] as const;

/** 강도는 종류의 색을 따른다. 헬스면 파랑, 유산소면 청록. */
export function intensityChoices(kind: Kind): Choice<Intensity>[] {
  return INTENSITIES.map((intensity, index) => ({
    value: intensity,
    label: INTENSITY_LABEL[intensity],
    tone: kind,
    level: LEVELS[index],
  }));
}

export const SLOT_LABEL: Record<NotifySlot, string> = {
  "07:30": "아침",
  "12:30": "점심",
  "18:30": "저녁",
  "21:00": "밤",
};

/** "밤 9시", "아침 7시 30분" 처럼 말로 읽는 시각. */
export function describeSlot(slot: NotifySlot): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const hour12 = ((hours ?? 0) + 11) % 12 + 1;
  const minute = minutes ? ` ${minutes}분` : "";
  return `${SLOT_LABEL[slot]} ${hour12}시${minute}`;
}
