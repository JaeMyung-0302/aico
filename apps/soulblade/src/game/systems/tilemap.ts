import Phaser from 'phaser'
import type { StageId } from '@soulblade/shared'
import { STAGE_BACKGROUNDS } from '../data/stages'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

// 타일맵 에셋 미확보 → 프로시저럴 배경 + 장애물 생성

interface StageEnvironment {
  readonly obstacles: Phaser.Physics.Arcade.StaticGroup
}

// 스테이지별 배경색 적용
export const applyStageBackground = (
  scene: Phaser.Scene,
  stageId: StageId,
): void => {
  const bg = STAGE_BACKGROUNDS[stageId]
  scene.cameras.main.setBackgroundColor(bg.color)
}

// 프로시저럴 장애물 생성
export const createStageObstacles = (
  scene: Phaser.Scene,
  stageId: StageId,
): StageEnvironment => {
  const obstacles = scene.physics.add.staticGroup()

  const configs = OBSTACLE_CONFIGS[stageId]
  for (const obs of configs) {
    const rect = scene.add.rectangle(obs.x, obs.y, obs.w, obs.h, obs.color)
    rect.setAlpha(0.6)
    obstacles.add(rect)
  }

  return { obstacles }
}

// 스테이지별 장애물 위치 (프리셋)
interface ObstaclePreset {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly color: number
}

const OBSTACLE_CONFIGS: Record<StageId, readonly ObstaclePreset[]> = {
  serpent_forest: [
    // 나무 장애물
    { x: 120, y: 200, w: 40, h: 40, color: 0x2d5a27 },
    { x: 400, y: 150, w: 50, h: 50, color: 0x2d5a27 },
    { x: 80, y: 600, w: 45, h: 45, color: 0x2d5a27 },
    { x: 450, y: 700, w: 40, h: 40, color: 0x2d5a27 },
    { x: 270, y: 400, w: 60, h: 30, color: 0x3a6b32 },
  ],
  ice_cave: [
    // 빙하 장애물
    { x: 100, y: 300, w: 60, h: 30, color: 0x88ccff },
    { x: 350, y: 200, w: 40, h: 60, color: 0x88ccff },
    { x: 200, y: 700, w: 80, h: 25, color: 0x88ccff },
    { x: 440, y: 550, w: 50, h: 50, color: 0x6699cc },
    { x: 270, y: 450, w: 70, h: 20, color: 0x6699cc },
    { x: 150, y: 850, w: 45, h: 45, color: 0x88ccff },
  ],
  flame_castle: [
    // 용암/기둥 장애물
    { x: 130, y: 250, w: 35, h: 70, color: 0x8b4513 },
    { x: 410, y: 350, w: 35, h: 70, color: 0x8b4513 },
    { x: 270, y: 500, w: 80, h: 20, color: 0xff4400 },
    { x: 90, y: 750, w: 50, h: 50, color: 0x8b4513 },
    { x: 460, y: 800, w: 35, h: 70, color: 0x8b4513 },
    { x: 200, y: 150, w: 60, h: 20, color: 0xff4400 },
    { x: 350, y: 650, w: 60, h: 20, color: 0xff4400 },
  ],
}

// 장애물 그룹 반환 (플레이어/몬스터 충돌용)
export const getObstacleGroup = (env: StageEnvironment): Phaser.Physics.Arcade.StaticGroup => {
  return env.obstacles
}
