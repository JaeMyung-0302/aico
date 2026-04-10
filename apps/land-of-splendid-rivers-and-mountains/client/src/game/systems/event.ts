import type Phaser from "phaser";
import type {
  Season,
  EventDefinition,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import type { IGameSystem } from "./system-manager";
import eventsData from "../data/events.json";

const eventDefs: ReadonlyArray<EventDefinition> =
  eventsData as ReadonlyArray<EventDefinition>;

export class EventSystem implements IGameSystem {
  readonly id = "event";

  private currentDay = 1;
  private currentSeason: Season = "spring";
  private activeEventId: string | null = null;
  private completedEvents = new Set<string>();

  private onDayEnd = ({
    day,
    season,
  }: {
    day: number;
    season: Season;
    year: number;
  }) => {
    this.currentDay = day;
    this.currentSeason = season;
    this.checkEvents();
  };

  private onSeasonChange = ({ season }: { season: Season }) => {
    this.currentSeason = season;
    this.completedEvents.clear();
  };

  init(_scene: Phaser.Scene): void {
    eventBus.on("time:dayEnd", this.onDayEnd);
    eventBus.on("time:seasonChange", this.onSeasonChange);
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Event logic is day-driven, no per-frame work needed
  }

  destroy(): void {
    eventBus.off("time:dayEnd", this.onDayEnd);
    eventBus.off("time:seasonChange", this.onSeasonChange);
  }

  getActiveEvent(): EventDefinition | null {
    if (!this.activeEventId) return null;
    return eventDefs.find((e) => e.id === this.activeEventId) ?? null;
  }

  getCompletedEvents(): ReadonlyArray<string> {
    return [...this.completedEvents];
  }

  completeEvent(eventId: string): void {
    const def = eventDefs.find((e) => e.id === eventId);
    if (!def || this.completedEvents.has(eventId)) return;

    this.completedEvents.add(eventId);
    this.activeEventId = null;

    eventBus.emit("event:completed", { eventId });
    eventBus.emit("event:reward", {
      eventId,
      goldReward: def.goldReward,
      items: [...def.rewards],
    });

    if (eventId === "jangma") {
      eventBus.emit("event:jangmaEnd", undefined);
    }
  }

  setState(
    completedEvents: ReadonlyArray<string>,
    activeEventId: string | null,
  ): void {
    this.completedEvents = new Set(completedEvents);
    this.activeEventId = activeEventId;
  }

  private checkEvents(): void {
    if (this.activeEventId) {
      const activeDef = eventDefs.find((e) => e.id === this.activeEventId);
      if (activeDef) {
        const endDay = activeDef.triggerDay + activeDef.durationDays;
        if (
          this.currentDay >= endDay ||
          this.currentSeason !== activeDef.season
        ) {
          this.completeEvent(this.activeEventId!);
        }
      }
    }

    for (const def of eventDefs) {
      if (def.season !== this.currentSeason) continue;
      if (this.completedEvents.has(def.id)) continue;
      if (this.currentDay < def.triggerDay) continue;
      if (this.currentDay >= def.triggerDay + def.durationDays) continue;

      if (this.activeEventId !== def.id) {
        this.activeEventId = def.id;
        eventBus.emit("event:started", { eventId: def.id });
      }
      break;
    }
  }
}
