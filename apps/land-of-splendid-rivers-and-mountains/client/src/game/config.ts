import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { BootScene } from "./scenes/BootScene";
import { PocScene } from "./scenes/PocScene";
import { FarmScene } from "./scenes/FarmScene";
import { VillageScene } from "./scenes/VillageScene";
import { DungeonScene } from "./scenes/DungeonScene";
import { RiverScene } from "./scenes/RiverScene";
import { MarketScene } from "./scenes/MarketScene";
import { TempleScene } from "./scenes/TempleScene";
import { BeachScene } from "./scenes/BeachScene";
import { IslandScene } from "./scenes/IslandScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_CONSTANTS.GAME_WIDTH,
  height: GAME_CONSTANTS.GAME_HEIGHT,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: "#228b22",
  render: {
    powerPreference: "high-performance",
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  audio: {
    disableWebAudio: true,
  },
  scene: [
    BootScene,
    PocScene,
    FarmScene,
    VillageScene,
    DungeonScene,
    RiverScene,
    MarketScene,
    TempleScene,
    BeachScene,
    IslandScene,
  ],
};
