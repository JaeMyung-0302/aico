import type Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { IGameSystem } from "./system-manager";

export class ReputationSystem implements IGameSystem {
  readonly id = "reputation";

  private previousReputation = 0;
  private thresholdEmitted = false;

  init(_scene: Phaser.Scene): void {
    eventBus.on("npc:relationChanged", this.recalculate);
    eventBus.on("quest:completed", this.recalculate);
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Reputation is event-driven, no per-frame work
  }

  destroy(): void {
    eventBus.off("npc:relationChanged", this.recalculate);
    eventBus.off("quest:completed", this.recalculate);
  }

  getReputation(): number {
    return useGameStore.getState().reputation;
  }

  loadState(reputation: number): void {
    useGameStore.getState().setReputation(reputation);
    this.previousReputation = reputation;
    this.thresholdEmitted =
      reputation >= GAME_CONSTANTS.REPUTATION_SANSHINRYEONG_THRESHOLD;
  }

  private readonly recalculate = (): void => {
    const store = useGameStore.getState();
    const relationSum = Object.values(store.npcRelations).reduce(
      (sum, val) => sum + Math.max(0, val),
      0,
    );
    const questBonus =
      store.completedQuests.length * GAME_CONSTANTS.REPUTATION_QUEST_BONUS;
    const raw = relationSum + questBonus;
    const clamped = Math.min(GAME_CONSTANTS.REPUTATION_MAX, Math.max(0, raw));

    if (clamped !== this.previousReputation) {
      this.previousReputation = clamped;
      store.setReputation(clamped);
      eventBus.emit("reputation:changed", { reputation: clamped });

      if (
        !this.thresholdEmitted &&
        clamped >= GAME_CONSTANTS.REPUTATION_SANSHINRYEONG_THRESHOLD
      ) {
        this.thresholdEmitted = true;
        eventBus.emit("reputation:thresholdReached", { threshold: 80 });
      }
    }
  };
}
