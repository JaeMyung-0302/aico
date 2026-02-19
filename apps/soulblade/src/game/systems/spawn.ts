import Phaser from 'phaser'
import type { WaveConfig, MonsterType, EliteMutationType } from '@soulblade/shared'
import { Monster } from '../entities/Monster'
import type { MonsterConfig } from '../entities/Monster'
import { EliteMonster } from '../entities/EliteMonster'
import { MAX_CONCURRENT_MONSTERS, MONSTER_TYPE_BASE_DEF } from '@soulblade/shared'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

interface SpawnState {
  lastSpawnTime: number
  waveNumber: number
}

// 몬스터 타입별 스탯 배율
const MONSTER_TYPE_MULTIPLIERS: Record<MonsterType, { hp: number; atk: number; spd: number }> = {
  normal: { hp: 1.0, atk: 1.0, spd: 1.0 },
  fast: { hp: 0.6, atk: 0.8, spd: 2.0 },
  tank: { hp: 3.0, atk: 0.6, spd: 0.5 },
  ranged: { hp: 0.8, atk: 1.5, spd: 0.8 },
  swarm: { hp: 0.4, atk: 0.5, spd: 1.5 },
}

const ELITE_MUTATIONS: readonly EliteMutationType[] = ['speedy', 'armored', 'splitting', 'ranged', 'explosive']

export const createSpawnState = (): SpawnState => ({
  lastSpawnTime: 0,
  waveNumber: 0,
})

// 경과 시간에 따른 스폰 간격 (ms) — 시간이 지날수록 빠르게
const getSpawnInterval = (elapsedSeconds: number): number => {
  if (elapsedSeconds < 60) return 2000
  if (elapsedSeconds < 180) return 1500
  if (elapsedSeconds < 360) return 1000
  if (elapsedSeconds < 600) return 700
  return 500
}

// 경과 시간에 따른 몬스터 스탯 스케일링
const getMonsterConfig = (elapsedSeconds: number): MonsterConfig => {
  const scale = 1 + Math.floor(elapsedSeconds / 60) * 0.3
  const level = Math.max(1, Math.floor(elapsedSeconds / 120) + 1)

  return {
    hp: Math.floor(8 * scale),
    atk: Math.floor(3 * scale),
    def: 3,
    spd: Math.min(2 + Math.floor(elapsedSeconds / 120), 6),
    level,
    expReward: Math.floor(5 + elapsedSeconds / 30),
    goldReward: Math.floor(2 + elapsedSeconds / 60),
  }
}

/**
 * 웨이브 기반 몬스터 스폰
 * Object Pool 패턴: 비활성 몬스터를 재활용
 */
export const processSpawn = (
  scene: Phaser.Scene,
  monsterGroup: Phaser.Physics.Arcade.Group,
  state: SpawnState,
  time: number,
  elapsedSeconds: number,
  playerX: number,
  playerY: number,
): void => {
  const interval = getSpawnInterval(elapsedSeconds)
  if (time - state.lastSpawnTime < interval) return

  // 동시 몬스터 상한 체크
  const activeCount = monsterGroup.getChildren().filter((c) => c.active).length
  if (activeCount >= MAX_CONCURRENT_MONSTERS) return

  state.lastSpawnTime = time
  state.waveNumber += 1

  // 한 번에 스폰할 몬스터 수 (시간에 따라 증가)
  const spawnCount = Math.min(
    1 + Math.floor(elapsedSeconds / 90),
    5,
  )

  const config = getMonsterConfig(elapsedSeconds)

  for (let i = 0; i < spawnCount; i++) {
    if (activeCount + i >= MAX_CONCURRENT_MONSTERS) break
    spawnMonster(scene, monsterGroup, config, playerX, playerY)
  }
}

const spawnMonster = (
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  config: MonsterConfig,
  playerX: number,
  playerY: number,
): void => {
  // 플레이어로부터 최소 150px 떨어진 화면 가장자리에서 스폰
  const { x, y } = getSpawnPosition(playerX, playerY)

  // Object Pool: 비활성 몬스터 재활용
  const inactive = group.getFirstDead(false) as Monster | null
  if (inactive) {
    inactive.reset(x, y, config)
    return
  }

  // 새 몬스터 생성
  const monster = new Monster(scene, x, y, config)
  group.add(monster)
}

/**
 * 웨이브 설정 기반 몬스터 스폰 (스테이지 통합)
 */
export const processWaveSpawn = (
  scene: Phaser.Scene,
  monsterGroup: Phaser.Physics.Arcade.Group,
  eliteGroup: Phaser.Physics.Arcade.Group,
  state: SpawnState,
  time: number,
  wave: WaveConfig,
  elapsedSeconds: number,
  playerX: number,
  playerY: number,
): void => {
  const interval = 1000 / wave.spawnRate
  if (time - state.lastSpawnTime < interval) return

  const activeMonsters = monsterGroup.getChildren().filter((c) => c.active).length
  const activeElites = eliteGroup.getChildren().filter((c) => c.active).length
  if (activeMonsters + activeElites >= wave.maxConcurrent) return

  state.lastSpawnTime = time
  state.waveNumber += 1

  const baseConfig = getMonsterConfig(elapsedSeconds)
  const pos = getSpawnPosition(playerX, playerY)

  // 엘리트 몬스터 확률 체크
  if (wave.eliteChance > 0 && Math.random() < wave.eliteChance) {
    const mutationIdx = Phaser.Math.Between(0, ELITE_MUTATIONS.length - 1)
    const mutation = ELITE_MUTATIONS[mutationIdx] as EliteMutationType
    const inactive = eliteGroup.getFirstDead(false) as EliteMonster | null
    if (inactive) {
      inactive.reset(pos.x, pos.y, baseConfig, mutation)
    } else {
      const elite = new EliteMonster(scene, pos.x, pos.y, baseConfig, mutation)
      eliteGroup.add(elite)
    }
    return
  }

  // 몬스터 타입별 스탯 적용
  const typeIdx = Phaser.Math.Between(0, wave.monsterTypes.length - 1)
  const monsterType = wave.monsterTypes[typeIdx] as MonsterType
  const mul = MONSTER_TYPE_MULTIPLIERS[monsterType]
  const baseDef = MONSTER_TYPE_BASE_DEF[monsterType]
  const typedConfig: MonsterConfig = {
    hp: Math.floor(baseConfig.hp * mul.hp),
    atk: Math.floor(baseConfig.atk * mul.atk),
    def: Math.floor(baseDef * (1 + 0.25 * (baseConfig.level - 1))),
    spd: Math.min(Math.floor(baseConfig.spd * mul.spd), 8),
    level: baseConfig.level,
    expReward: baseConfig.expReward,
    goldReward: baseConfig.goldReward,
  }

  const inactive = monsterGroup.getFirstDead(false) as Monster | null
  if (inactive) {
    inactive.reset(pos.x, pos.y, typedConfig)
  } else {
    const monster = new Monster(scene, pos.x, pos.y, typedConfig)
    monsterGroup.add(monster)
  }
}

export const getSpawnPosition = (
  playerX: number,
  playerY: number,
): { x: number; y: number } => {
  const margin = 30
  const minDistFromPlayer = 150

  for (let attempt = 0; attempt < 10; attempt++) {
    // 화면 가장자리에서 스폰
    const side = Phaser.Math.Between(0, 3)
    let x: number
    let y: number

    switch (side) {
      case 0: // 상단
        x = Phaser.Math.Between(margin, GAME_WIDTH - margin)
        y = margin
        break
      case 1: // 하단
        x = Phaser.Math.Between(margin, GAME_WIDTH - margin)
        y = GAME_HEIGHT - margin
        break
      case 2: // 좌측
        x = margin
        y = Phaser.Math.Between(margin, GAME_HEIGHT - margin)
        break
      default: // 우측
        x = GAME_WIDTH - margin
        y = Phaser.Math.Between(margin, GAME_HEIGHT - margin)
        break
    }

    const dist = Phaser.Math.Distance.Between(x, y, playerX, playerY)
    if (dist >= minDistFromPlayer) {
      return { x, y }
    }
  }

  // fallback: 좌상단
  return { x: margin, y: margin }
}
