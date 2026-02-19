import Phaser from 'phaser'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from '@soulblade/shared'
import { BootScene } from './scenes/BootScene'
import { StageLoadScene } from './scenes/StageLoadScene'
import { GameScene } from './scenes/GameScene'

// 뷰포트 (화면 크기)
const GAME_WIDTH = VIEWPORT_WIDTH
const GAME_HEIGHT = VIEWPORT_HEIGHT

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent,
  backgroundColor: '#1a1a2e',
  input: {
    keyboard: false, // React에서 키보드 입력 처리 (Phaser 캡처 비활성화)
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, StageLoadScene, GameScene],
})

export { GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT }
