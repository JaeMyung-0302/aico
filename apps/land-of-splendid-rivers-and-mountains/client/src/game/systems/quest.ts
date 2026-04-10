import type Phaser from "phaser";
import type { QuestDefinition } from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { IGameSystem } from "./system-manager";
import storyData from "../data/story.json";

const questDefs: ReadonlyArray<QuestDefinition> =
  storyData as ReadonlyArray<QuestDefinition>;

const SCENE_TO_LOCATION: Readonly<Record<string, string>> = {
  VillageScene: "village",
  TempleScene: "temple",
  BeachScene: "beach",
  IslandScene: "island",
};

export class QuestSystem implements IGameSystem {
  readonly id = "quest";

  private readonly activeQuests = new Set<string>();
  private readonly completedQuests = new Set<string>();
  private readonly progress = new Map<string, number[]>();

  init(_scene: Phaser.Scene): void {
    eventBus.on("farm:harvested", this.onHarvested);
    eventBus.on("fishing:caught", this.onFishCaught);
    eventBus.on("crafting:cook", this.onCooked);
    eventBus.on("crafting:ferment", this.onFermented);
    eventBus.on("npc:gifted", this.onGifted);
    eventBus.on("player:moved", this.onPlayerMoved);
    eventBus.on("combat:defeated", this.onCombatDefeated);
    eventBus.on("dungeon:cleared", this.onDungeonCleared);
    eventBus.on("npc:relationChanged", this.onRelationChanged);

    this.checkAvailableQuests();
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Quest system is event-driven, no per-frame work
  }

  destroy(): void {
    eventBus.off("farm:harvested", this.onHarvested);
    eventBus.off("fishing:caught", this.onFishCaught);
    eventBus.off("crafting:cook", this.onCooked);
    eventBus.off("crafting:ferment", this.onFermented);
    eventBus.off("npc:gifted", this.onGifted);
    eventBus.off("player:moved", this.onPlayerMoved);
    eventBus.off("combat:defeated", this.onCombatDefeated);
    eventBus.off("dungeon:cleared", this.onDungeonCleared);
    eventBus.off("npc:relationChanged", this.onRelationChanged);
  }

  getState(): {
    active: ReadonlyArray<string>;
    completed: ReadonlyArray<string>;
    progress: Readonly<Record<string, ReadonlyArray<number>>>;
  } {
    const progressObj: Record<string, ReadonlyArray<number>> = {};
    for (const [id, vals] of this.progress) {
      progressObj[id] = [...vals];
    }
    return {
      active: [...this.activeQuests],
      completed: [...this.completedQuests],
      progress: progressObj,
    };
  }

  loadState(
    active: ReadonlyArray<string>,
    completed: ReadonlyArray<string>,
    progressData: Readonly<Record<string, ReadonlyArray<number>>>,
  ): void {
    this.activeQuests.clear();
    this.completedQuests.clear();
    this.progress.clear();

    for (const id of active) this.activeQuests.add(id);
    for (const id of completed) this.completedQuests.add(id);
    for (const [id, vals] of Object.entries(progressData)) {
      this.progress.set(id, [...vals]);
    }

    this.syncStore();
    this.checkAvailableQuests();
  }

  private checkAvailableQuests(): void {
    const store = useGameStore.getState();

    for (const def of questDefs) {
      if (this.activeQuests.has(def.id)) continue;
      if (this.completedQuests.has(def.id)) continue;

      if (def.prerequisite && !this.completedQuests.has(def.prerequisite))
        continue;

      if (
        def.type === "personal" &&
        def.npcId &&
        def.unlockRelation !== undefined
      ) {
        const relation = store.npcRelations[def.npcId] ?? 0;
        if (relation < def.unlockRelation) continue;
      }

      this.activeQuests.add(def.id);
      const reqCount = def.requirements.length;
      this.progress.set(def.id, new Array<number>(reqCount).fill(0));
      eventBus.emit("quest:accepted", { questId: def.id });
    }

    this.syncStore();
  }

  private advanceRequirement(type: string, target: string): void {
    let changed = false;

    for (const questId of this.activeQuests) {
      const def = questDefs.find((q) => q.id === questId);
      if (!def) continue;

      const prog = this.progress.get(questId);
      if (!prog) continue;

      for (let i = 0; i < def.requirements.length; i++) {
        const req = def.requirements[i]!;
        if (req.type !== type || req.target !== target) continue;
        if (prog[i]! >= req.quantity) continue;

        prog[i] = prog[i]! + 1;
        changed = true;

        eventBus.emit("quest:progress", {
          questId,
          requirementIndex: i,
          current: prog[i]!,
          target: req.quantity,
        });
      }
    }

    if (changed) {
      this.syncStore();
      this.checkCompletions();
    }
  }

  private checkCompletions(): void {
    const toComplete: string[] = [];

    for (const questId of this.activeQuests) {
      const def = questDefs.find((q) => q.id === questId);
      if (!def) continue;

      const prog = this.progress.get(questId);
      if (!prog) continue;

      const allMet = def.requirements.every(
        (req, i) => (prog[i] ?? 0) >= req.quantity,
      );
      if (allMet) toComplete.push(questId);
    }

    for (const questId of toComplete) {
      this.completeQuest(questId);
    }
  }

  private completeQuest(questId: string): void {
    const def = questDefs.find((q) => q.id === questId);
    if (!def) return;

    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);

    if (def.goldReward > 0) {
      const store = useGameStore.getState();
      eventBus.emit("gold:changed", {
        amount: def.goldReward,
        total: store.gold + def.goldReward,
      });
    }

    if (def.rewards.length > 0) {
      eventBus.emit("event:reward", {
        eventId: questId,
        goldReward: 0,
        items: [...def.rewards],
      });
    }

    eventBus.emit("quest:completed", { questId });
    this.syncStore();
    this.checkAvailableQuests();
  }

  private syncStore(): void {
    const state = this.getState();
    useGameStore
      .getState()
      .setQuests(state.active, state.completed, state.progress);
  }

  // --- Event handlers ---

  private readonly onHarvested = ({
    cropId,
  }: {
    x: number;
    y: number;
    cropId: string;
    quantity: number;
  }): void => {
    this.advanceRequirement("harvest", cropId);
  };

  private readonly onFishCaught = ({ fishId }: { fishId: string }): void => {
    this.advanceRequirement("fish", fishId.replace("fish-", ""));
  };

  private readonly onCooked = ({ recipeId }: { recipeId: string }): void => {
    this.advanceRequirement("cook", recipeId.replace("cooking-", ""));
  };

  private readonly onFermented = ({ recipeId }: { recipeId: string }): void => {
    this.advanceRequirement("cook", recipeId.replace("ferment-", ""));
  };

  private readonly onGifted = ({
    npcId,
  }: {
    npcId: string;
    itemId: string;
    reaction: string;
  }): void => {
    this.advanceRequirement("gift", npcId);
    this.checkAvailableQuests();
  };

  private readonly onPlayerMoved = ({
    scene,
  }: {
    scene: string;
    tileX: number;
    tileY: number;
  }): void => {
    const location = SCENE_TO_LOCATION[scene];
    if (location) {
      this.advanceRequirement("explore", location);
    }
  };

  private readonly onCombatDefeated = ({
    monsterId,
    drops,
  }: {
    monsterId: string;
    drops: ReadonlyArray<{ itemId: string; quantity: number }>;
  }): void => {
    this.advanceRequirement("combat", monsterId);
    for (const drop of drops) {
      this.advanceRequirement("harvest", drop.itemId);
    }
  };

  private readonly onDungeonCleared = ({ floor }: { floor: number }): void => {
    this.advanceRequirement("combat", `dungeon-floor-${floor}`);
  };

  private readonly onRelationChanged = (): void => {
    this.checkAvailableQuests();
  };
}
