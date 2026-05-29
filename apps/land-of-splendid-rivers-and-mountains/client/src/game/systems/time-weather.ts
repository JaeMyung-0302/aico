import Phaser from "phaser";
import type {
  Season,
  Weather,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import type { IGameSystem } from "./system-manager";

const SEASONS = GAME_CONSTANTS.SEASONS;

const WEATHER_PROBABILITIES: Readonly<
  Record<Season, ReadonlyArray<{ weather: Weather; weight: number }>>
> = {
  spring: [
    { weather: "clear", weight: 50 },
    { weather: "rain", weight: 30 },
    { weather: "fog", weight: 15 },
    { weather: "storm", weight: 5 },
  ],
  summer: [
    { weather: "clear", weight: 45 },
    { weather: "rain", weight: 25 },
    { weather: "storm", weight: 20 },
    { weather: "fog", weight: 10 },
  ],
  autumn: [
    { weather: "clear", weight: 55 },
    { weather: "rain", weight: 20 },
    { weather: "fog", weight: 20 },
    { weather: "storm", weight: 5 },
  ],
  winter: [
    { weather: "clear", weight: 40 },
    { weather: "snow", weight: 35 },
    { weather: "fog", weight: 15 },
    { weather: "storm", weight: 10 },
  ],
};

const WEATHER_OVERLAY_TINT: Readonly<
  Record<Weather, { color: number; extraAlpha: number }>
> = {
  clear: { color: 0x000033, extraAlpha: 0 },
  rain: { color: 0x001133, extraAlpha: 0.1 },
  snow: { color: 0x111122, extraAlpha: 0.05 },
  storm: { color: 0x000022, extraAlpha: 0.2 },
  fog: { color: 0x222222, extraAlpha: 0.15 },
};
interface TimePoint {
  minute: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
}

const SEASON_COLOR_TINT: Readonly<
  Record<Season, { r: number; g: number; b: number }>
> = {
  spring: { r: 10, g: 20, b: 0 },
  summer: { r: 5, g: 0, b: -5 },
  autumn: { r: 20, g: 10, b: -10 },
  winter: { r: -10, g: -5, b: 15 },
};

const BRIGHTNESS_CURVE: ReadonlyArray<TimePoint> = [
  { minute: 300, alpha: 0.55, r: 10, g: 10, b: 40 }, // 새벽 (짙은 남색)
  { minute: 330, alpha: 0.4, r: 40, g: 20, b: 60 }, // 새벽녘 (보라)
  { minute: 360, alpha: 0.25, r: 180, g: 100, b: 60 }, // 일출 (주황)
  { minute: 420, alpha: 0.1, r: 255, g: 180, b: 100 }, // 아침 (따뜻한 황금)
  { minute: 480, alpha: 0, r: 0, g: 0, b: 0 }, // 오전 (밝음)
  { minute: 1020, alpha: 0, r: 0, g: 0, b: 0 }, // 오후 (밝음)
  { minute: 1080, alpha: 0.08, r: 255, g: 160, b: 60 }, // 해질 무렵 (주황)
  { minute: 1140, alpha: 0.2, r: 200, g: 80, b: 50 }, // 석양 (붉은빛)
  { minute: 1200, alpha: 0.35, r: 80, g: 40, b: 80 }, // 해진 후 (보라)
  { minute: 1320, alpha: 0.5, r: 15, g: 10, b: 45 }, // 밤 (짙은 남색)
  { minute: 1440, alpha: 0.55, r: 10, g: 10, b: 40 }, // 자정 (짙은 남색)
];

type QualityLevel = "high" | "medium" | "low";

const QUALITY_PARTICLE_SCALE: Readonly<
  Record<QualityLevel, { rain: number; snow: number }>
> = {
  high: { rain: 1, snow: 1 },
  medium: { rain: 0.5, snow: 0.5 },
  low: { rain: 0.25, snow: 0.25 },
};

export class TimeWeatherSystem implements IGameSystem {
  readonly id = "time-weather";

  private timeOfDay: number = GAME_CONSTANTS.DAY_START_MINUTE;
  private day = 1;
  private season: Season = "spring";
  private year = 1;
  private weather: Weather = "clear";
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private tickAccumulator = 0;
  private qualityLevel: QualityLevel = "high";
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;
  private snowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;

  init(scene: Phaser.Scene): void {
    this.overlay = scene.add.rectangle(
      GAME_CONSTANTS.GAME_WIDTH / 2,
      GAME_CONSTANTS.GAME_HEIGHT / 2,
      GAME_CONSTANTS.GAME_WIDTH,
      GAME_CONSTANTS.GAME_HEIGHT,
      0x000033,
      0,
    );
    this.overlay.setScrollFactor(0).setDepth(800);

    this.createWeatherParticles(scene);
    this.updateBrightness();
    this.updateWeatherParticles();
    eventBus.on("quality:changed", this.onQualityChanged);
  }

  update(_scene: Phaser.Scene, _time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const minutesElapsed =
      deltaSeconds * GAME_CONSTANTS.MINUTES_PER_REAL_SECOND;
    this.timeOfDay += minutesElapsed;

    this.tickAccumulator += deltaSeconds;
    if (this.tickAccumulator >= 1) {
      this.tickAccumulator = 0;
      eventBus.emit("time:tick", { timeOfDay: Math.floor(this.timeOfDay) });
    }

    if (this.timeOfDay >= GAME_CONSTANTS.DAY_END_MINUTE) {
      this.advanceDay();
    }

    this.updateBrightness();
  }

  destroy(): void {
    eventBus.off("quality:changed", this.onQualityChanged);
    this.overlay?.destroy();
    this.overlay = null;
    this.rainEmitter?.destroy();
    this.rainEmitter = null;
    this.snowEmitter?.destroy();
    this.snowEmitter = null;
  }

  getTimeOfDay(): number {
    return Math.floor(this.timeOfDay);
  }

  getDay(): number {
    return this.day;
  }

  getSeason(): Season {
    return this.season;
  }

  getYear(): number {
    return this.year;
  }

  getFormattedTime(): string {
    const totalMinutes = Math.floor(this.timeOfDay);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const period = hours >= 12 ? "오후" : "오전";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${period} ${displayHours}:${String(minutes).padStart(2, "0")}`;
  }

  getWeather(): Weather {
    return this.weather;
  }

  setWeather(weather: Weather): void {
    this.weather = weather;
    this.updateWeatherParticles();
  }

  setState(
    day: number,
    season: Season,
    year: number,
    timeOfDay: number,
    weather?: Weather,
  ): void {
    this.day = day;
    this.season = season;
    this.year = year;
    this.timeOfDay = timeOfDay;
    if (weather !== undefined) {
      this.weather = weather;
      this.updateWeatherParticles();
    }
  }

  private advanceDay(): void {
    eventBus.emit("time:dayEnd", {
      day: this.day,
      season: this.season,
      year: this.year,
    });

    this.timeOfDay = GAME_CONSTANTS.DAY_START_MINUTE;
    this.day += 1;

    if (this.day > GAME_CONSTANTS.DAYS_PER_SEASON) {
      this.day = 1;
      this.advanceSeason();
    }

    this.rollWeather();
  }

  private rollWeather(): void {
    const probabilities = WEATHER_PROBABILITIES[this.season];
    const totalWeight = probabilities.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of probabilities) {
      roll -= entry.weight;
      if (roll <= 0) {
        this.weather = entry.weather;
        eventBus.emit("weather:changed", { weather: this.weather });
        this.updateWeatherParticles();
        return;
      }
    }

    this.weather = "clear";
    eventBus.emit("weather:changed", { weather: this.weather });
    this.updateWeatherParticles();
  }

  private advanceSeason(): void {
    const currentIndex = SEASONS.indexOf(this.season);
    const nextIndex = (currentIndex + 1) % SEASONS.length;
    const prevSeason = this.season;

    if (nextIndex === 0) {
      this.year += 1;
    }

    eventBus.emit("season:transitionStart", {
      from: prevSeason,
      to: SEASONS[nextIndex]!,
      year: this.year,
    });

    this.season = SEASONS[nextIndex]!;

    eventBus.emit("time:seasonChange", {
      season: this.season,
      year: this.year,
    });

    eventBus.emit("season:transitionEnd", {
      season: this.season,
      year: this.year,
    });
  }

  private updateBrightness(): void {
    if (!this.overlay) return;

    const currentMinute = Math.floor(this.timeOfDay);
    let alpha = 0;
    let r = 0;
    let g = 0;
    let b = 0;

    const last = BRIGHTNESS_CURVE[BRIGHTNESS_CURVE.length - 1]!;
    const first = BRIGHTNESS_CURVE[0]!;

    if (currentMinute >= last.minute) {
      alpha = last.alpha;
      r = last.r;
      g = last.g;
      b = last.b;
    } else if (currentMinute < first.minute) {
      alpha = first.alpha;
      r = first.r;
      g = first.g;
      b = first.b;
    } else {
      for (let i = 0; i < BRIGHTNESS_CURVE.length - 1; i++) {
        const cur = BRIGHTNESS_CURVE[i]!;
        const nxt = BRIGHTNESS_CURVE[i + 1]!;

        if (currentMinute >= cur.minute && currentMinute < nxt.minute) {
          const t = (currentMinute - cur.minute) / (nxt.minute - cur.minute);
          alpha = cur.alpha + (nxt.alpha - cur.alpha) * t;
          r = Math.round(cur.r + (nxt.r - cur.r) * t);
          g = Math.round(cur.g + (nxt.g - cur.g) * t);
          b = Math.round(cur.b + (nxt.b - cur.b) * t);
          break;
        }
      }
    }

    const seasonTint = SEASON_COLOR_TINT[this.season];
    const tint = WEATHER_OVERLAY_TINT[this.weather];
    const finalR = Math.min(
      255,
      Math.max(0, r + ((tint.color >> 16) & 0xff) + seasonTint.r),
    );
    const finalG = Math.min(
      255,
      Math.max(0, g + ((tint.color >> 8) & 0xff) + seasonTint.g),
    );
    const finalB = Math.min(
      255,
      Math.max(0, b + (tint.color & 0xff) + seasonTint.b),
    );
    this.overlay.fillColor = (finalR << 16) | (finalG << 8) | finalB;
    this.overlay.setAlpha(Math.min(alpha + tint.extraAlpha, 0.8));
  }

  private createWeatherParticles(scene: Phaser.Scene): void {
    const gw = GAME_CONSTANTS.GAME_WIDTH;

    if (!scene.textures.exists("_rain_drop")) {
      const rainCanvas = scene.textures.createCanvas("_rain_drop", 2, 6);
      if (rainCanvas) {
        const rctx = rainCanvas.context;
        rctx.fillStyle = "rgba(180,210,255,0.6)";
        rctx.fillRect(0, 0, 2, 6);
        rainCanvas.refresh();
      }
    }

    if (!scene.textures.exists("_snow_flake")) {
      const snowCanvas = scene.textures.createCanvas("_snow_flake", 4, 4);
      if (snowCanvas) {
        const sctx = snowCanvas.context;
        sctx.beginPath();
        sctx.arc(2, 2, 2, 0, Math.PI * 2);
        sctx.fillStyle = "rgba(255,255,255,0.8)";
        sctx.fill();
        snowCanvas.refresh();
      }
    }

    this.rainEmitter = scene.add.particles(0, 0, "_rain_drop", {
      x: { min: 0, max: gw },
      y: -10,
      lifespan: 600,
      speedY: { min: 300, max: 500 },
      speedX: { min: -30, max: -60 },
      quantity: 3,
      frequency: 20,
      alpha: { start: 0.7, end: 0.2 },
      scale: { min: 0.8, max: 1.2 },
      emitting: false,
    });
    this.rainEmitter.setScrollFactor(0).setDepth(790);

    this.snowEmitter = scene.add.particles(0, 0, "_snow_flake", {
      x: { min: 0, max: gw },
      y: -10,
      lifespan: 3000,
      speedY: { min: 30, max: 60 },
      speedX: { min: -20, max: 20 },
      quantity: 1,
      frequency: 80,
      alpha: { start: 0.9, end: 0.3 },
      scale: { min: 0.5, max: 1 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.snowEmitter.setScrollFactor(0).setDepth(790);
  }

  private readonly onQualityChanged = ({
    level,
  }: {
    level: QualityLevel;
  }): void => {
    this.qualityLevel = level;
    this.updateWeatherParticles();
  };

  private updateWeatherParticles(): void {
    if (!this.rainEmitter || !this.snowEmitter) return;

    const isRain = this.weather === "rain";
    const isStorm = this.weather === "storm";
    const isSnow = this.weather === "snow";
    const scale = QUALITY_PARTICLE_SCALE[this.qualityLevel];

    this.rainEmitter.emitting = isRain || isStorm;
    if (isStorm) {
      this.rainEmitter.quantity = Math.max(1, Math.round(6 * scale.rain));
      this.rainEmitter.frequency = Math.round(10 / scale.rain);
    } else if (isRain) {
      this.rainEmitter.quantity = Math.max(1, Math.round(3 * scale.rain));
      this.rainEmitter.frequency = Math.round(20 / scale.rain);
    }

    this.snowEmitter.emitting = isSnow;
    if (isSnow) {
      this.snowEmitter.quantity = Math.max(1, Math.round(1 * scale.snow));
    }
  }
}
