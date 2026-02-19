import Phaser from 'phaser'
import type { ZoneConfig, MonsterType, EliteMutationType } from '@soulblade/shared'
import { CULLING_PADDING, MONSTER_TYPE_BASE_DEF } from '@soulblade/shared'
import { Monster } from '../entities/Monster'
import type { MonsterConfig } from '../entities/Monster'
import { EliteMonster } from '../entities/EliteMonster'

// 몬스터 타입별 스탯 배율
const MONSTER_TYPE_MULTIPLIERS: Record<MonsterType, { hp: number; atk: number; spd: number }> = {
  normal: { hp: 1.0, atk: 1.0, spd: 1.0 },
  fast: { hp: 0.6, atk: 0.8, spd: 2.0 },
  tank: { hp: 3.0, atk: 0.6, spd: 0.5 },
  ranged: { hp: 0.8, atk: 1.5, spd: 0.8 },
  swarm: { hp: 0.4, atk: 0.5, spd: 1.5 },
}

const ELITE_MUTATIONS: readonly EliteMutationType[] = ['speedy', 'armored', 'splitting', 'ranged', 'explosive']

// 존별 스폰 상태
interface ZoneSpawnState {
  readonly zoneId: string
  lastSpawnTime: number
  activeCount: number
}

// 레벨 기반 몬스터 스탯 계산
const getMonsterConfigByLevel = (level: number): MonsterConfig => {
  const scale = 1 + (level - 1) * 0.25
  return {
    hp: Math.floor(10 * scale),
    atk: Math.floor(4 * scale),
    def: Math.floor(MONSTER_TYPE_BASE_DEF.normal * (1 + 0.25 * (level - 1))),
    spd: Math.min(2 + Math.floor(level / 10), 6),
    level,
    expReward: Math.floor(5 + level * 2),
    goldReward: Math.floor(2 + level),
  }
}

// 존 bounds 내 랜덤 위치
const getZoneSpawnPosition = (zone: ZoneConfig): { x: number; y: number } => {
  const margin = 20
  const x = Phaser.Math.Between(
    zone.bounds.x + margin,
    zone.bounds.x + zone.bounds.width - margin,
  )
  const y = Phaser.Math.Between(
    zone.bounds.y + margin,
    zone.bounds.y + zone.bounds.height - margin,
  )
  return { x, y }
}

// 카메라 뷰 + 패딩 내에 존이 있는지 확인
const isZoneVisible = (zone: ZoneConfig, camera: Phaser.Cameras.Scene2D.Camera): boolean => {
  const padding = CULLING_PADDING
  const camX = camera.scrollX - padding
  const camY = camera.scrollY - padding
  const camW = camera.width + padding * 2
  const camH = camera.height + padding * 2

  const b = zone.bounds
  return (
    b.x + b.width > camX &&
    b.x < camX + camW &&
    b.y + b.height > camY &&
    b.y < camY + camH
  )
}

export class ZoneSpawnManager {
  private scene: Phaser.Scene
  private monsterGroup: Phaser.Physics.Arcade.Group
  private eliteGroup: Phaser.Physics.Arcade.Group
  private zones: readonly ZoneConfig[] = []
  private zoneStates: Map<string, ZoneSpawnState> = new Map()

  constructor(
    scene: Phaser.Scene,
    monsterGroup: Phaser.Physics.Arcade.Group,
    eliteGroup: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene
    this.monsterGroup = monsterGroup
    this.eliteGroup = eliteGroup
  }

  // 존 등록 (맵 로드 시 호출)
  registerZones = (zones: readonly ZoneConfig[]): void => {
    this.zones = zones
    this.zoneStates.clear()
    for (const zone of zones) {
      this.zoneStates.set(zone.id, {
        zoneId: zone.id,
        lastSpawnTime: 0,
        activeCount: 0,
      })
    }
  }

  // 매 프레임 업데이트: 카메라 근처 존만 스폰
  update = (time: number): void => {
    const camera = this.scene.cameras.main

    for (const zone of this.zones) {
      // 카메라 컬링: 뷰포트 + 200px 범위 밖이면 스킵
      if (!isZoneVisible(zone, camera)) continue

      const state = this.zoneStates.get(zone.id)
      if (!state) continue

      // 리스폰 딜레이 체크
      if (time - state.lastSpawnTime < zone.respawnDelay) continue

      // 존 내 활성 몬스터 수 계산
      const activeInZone = this.countActiveInZone(zone)
      if (activeInZone >= zone.maxConcurrent) continue

      // 스폰
      state.lastSpawnTime = time
      this.spawnInZone(zone)
    }
  }

  // 모든 몬스터 제거 (맵 전환 시)
  clearAll = (): void => {
    for (const child of this.monsterGroup.getChildren()) {
      const monster = child as Monster
      if (monster.active) {
        monster.setActive(false)
        monster.setVisible(false)
        if (monster.body) monster.body.enable = false
      }
    }
    for (const child of this.eliteGroup.getChildren()) {
      const elite = child as EliteMonster
      if (elite.active) {
        elite.setActive(false)
        elite.setVisible(false)
        if (elite.body) elite.body.enable = false
      }
    }
    this.zoneStates.clear()
    this.zones = []
  }

  // --- Private ---

  private countActiveInZone = (zone: ZoneConfig): number => {
    let count = 0
    const b = zone.bounds

    for (const child of this.monsterGroup.getChildren()) {
      const m = child as Monster
      if (m.active && m.x >= b.x && m.x <= b.x + b.width && m.y >= b.y && m.y <= b.y + b.height) {
        count++
      }
    }
    for (const child of this.eliteGroup.getChildren()) {
      const e = child as EliteMonster
      if (e.active && e.x >= b.x && e.x <= b.x + b.width && e.y >= b.y && e.y <= b.y + b.height) {
        count++
      }
    }

    return count
  }

  private spawnInZone = (zone: ZoneConfig): void => {
    const baseConfig = getMonsterConfigByLevel(zone.monsterLevel)
    const pos = getZoneSpawnPosition(zone)

    // 엘리트 체크
    if (zone.eliteChance > 0 && Math.random() < zone.eliteChance) {
      const mutationIdx = Phaser.Math.Between(0, ELITE_MUTATIONS.length - 1)
      const mutation = ELITE_MUTATIONS[mutationIdx] as EliteMutationType
      const inactive = this.eliteGroup.getFirstDead(false) as EliteMonster | null
      if (inactive) {
        inactive.reset(pos.x, pos.y, baseConfig, mutation)
      } else {
        const elite = new EliteMonster(this.scene, pos.x, pos.y, baseConfig, mutation)
        this.eliteGroup.add(elite)
      }
      return
    }

    // 타입별 스탯 적용
    const typeIdx = Phaser.Math.Between(0, zone.monsterTypes.length - 1)
    const monsterType = zone.monsterTypes[typeIdx] as MonsterType
    const mul = MONSTER_TYPE_MULTIPLIERS[monsterType]
    const baseDef = MONSTER_TYPE_BASE_DEF[monsterType]
    const typedConfig: MonsterConfig = {
      hp: Math.floor(baseConfig.hp * mul.hp),
      atk: Math.floor(baseConfig.atk * mul.atk),
      def: Math.floor(baseDef * (1 + 0.25 * (zone.monsterLevel - 1))),
      spd: Math.min(Math.floor(baseConfig.spd * mul.spd), 8),
      level: zone.monsterLevel,
      expReward: baseConfig.expReward,
      goldReward: baseConfig.goldReward,
    }

    const inactive = this.monsterGroup.getFirstDead(false) as Monster | null
    if (inactive) {
      inactive.reset(pos.x, pos.y, typedConfig)
    } else {
      const monster = new Monster(this.scene, pos.x, pos.y, typedConfig)
      this.monsterGroup.add(monster)
    }
  }
}
