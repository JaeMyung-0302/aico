import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import { getChildAgeInDays } from "./family";
import { toAbsoluteDay } from "./marriage-runtime";

/** 30일 미만은 아기, 이후 어린이 모습 */
const TODDLER_AGE_DAYS = 30;

interface FamilyRenderContext {
  readonly homeTileX: number;
  readonly homeTileY: number;
}

/**
 * 자녀 농장 렌더링 (Ch.3): 집 근처 타일에 자녀를 이모지로 표시.
 * family:childBorn 시 즉시 추가. FarmScene 전용, cleanup 반환.
 */
export const setupFamilyRendering = (
  scene: Phaser.Scene,
  ctx: FamilyRenderContext,
): (() => void) => {
  const size = GAME_CONSTANTS.TILE_SIZE;
  const sprites: Phaser.GameObjects.Text[] = [];

  const render = (): void => {
    for (const text of sprites) {
      text.destroy();
    }
    sprites.length = 0;

    const s = useGameStore.getState();
    const today = toAbsoluteDay(s.day, s.season, s.year);
    s.familyChildren.forEach((child, i) => {
      const emoji =
        getChildAgeInDays(child, today) < TODDLER_AGE_DAYS ? "👶" : "🧒";
      const text = scene.add.text(
        (ctx.homeTileX + i) * size + size / 2,
        ctx.homeTileY * size + size / 2,
        emoji,
        { fontSize: `${size * 0.8}px` },
      );
      text.setOrigin(0.5);
      text.setDepth(9);
      sprites.push(text);
    });
  };

  render();

  const onChildBorn = (): void => render();
  // 나이 갱신(아기→어린이)은 하루 단위면 충분
  const onDayEnd = (): void => render();

  eventBus.on("family:childBorn", onChildBorn);
  eventBus.on("time:dayEnd", onDayEnd);
  return () => {
    eventBus.off("family:childBorn", onChildBorn);
    eventBus.off("time:dayEnd", onDayEnd);
    for (const text of sprites) {
      text.destroy();
    }
    sprites.length = 0;
  };
};
