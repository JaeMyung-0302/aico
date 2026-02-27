/**
 * R3F 스폰 시스템
 * Phaser ZoneSpawnManager + spawn.ts의 순수 함수 포팅
 *
 * Phaser.Physics.Arcade.Group → MonsterEntity[]/EliteEntity[] 배열 기반
 * Phaser.Math.Between → Math.random() 사용
 */

import type {
  ZoneConfig,
  MonsterType,
  EliteMutationType,
} from '@soulblade/shared'
import { CULLING_PADDING, MAX_CONCURRENT_MONSTERS } from '@soulblade/shared'
import type { MonsterEntity, EliteEntity } from '../types'
import {
  createMonster,
  getMonsterConfigByLevel,
  monsterReset,
} from '../data/monster-data'
import {
  createElite,
  ELITE_MUTATION_TYPES,
  eliteReset,
} from '../data/elite-data'
import type { MonsterSpawnConfig } from '../data/monster-data'
import { randomBetween } from '../physics/aabb'

// ── 스폰 상태 ──

interface ZoneSpawnState {
  readonly zoneId: string
  lastSpawnTime: number
}

export interface SpawnManagerState {
  zones: readonly ZoneConfig[]
  zoneStates: Map<string, ZoneSpawnState>
}

export const createSpawnManagerState = (): SpawnManagerState => ({
  zones: [],
  zoneStates: new Map(),
})

// ── 존 등록 ──

/** @mutates state.zones, state.zoneStates */
export const registerZones = (
  state: SpawnManagerState,
  zones: readonly ZoneConfig[],
): void => {
  state.zones = zones
  state.zoneStates.clear()
  for (const zone of zones) {
    state.zoneStates.set(zone.id, {
      zoneId: zone.id,
      lastSpawnTime: 0,
    })
  }
}

// ── 존 내 랜덤 위치 ──

const getZoneSpawnPosition = (zone: ZoneConfig): { x: number; y: number } => {
  const margin = 20
  return {
    x: randomBetween(
      zone.bounds.x + margin,
      zone.bounds.x + zone.bounds.width - margin,
    ),
    y: randomBetween(
      zone.bounds.y + margin,
      zone.bounds.y + zone.bounds.height - margin,
    ),
  }
}

// ── 카메라 뷰 컬링 ──

const isZoneVisible = (
  zone: ZoneConfig,
  cameraX: number,
  cameraY: number,
  cameraW: number,
  cameraH: number,
): boolean => {
  const padding = CULLING_PADDING
  const camX = cameraX - padding
  const camY = cameraY - padding
  const camW = cameraW + padding * 2
  const camH = cameraH + padding * 2

  const b = zone.bounds
  return (
    b.x + b.width > camX &&
    b.x < camX + camW &&
    b.y + b.height > camY &&
    b.y < camY + camH
  )
}

// ── 존 내 활성 몬스터 수 ──

const countActiveInZone = (
  zone: ZoneConfig,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
): number => {
  const b = zone.bounds
  let count = 0

  for (const m of monsters) {
    if (
      m.active &&
      m.body.x >= b.x &&
      m.body.x <= b.x + b.width &&
      m.body.y >= b.y &&
      m.body.y <= b.y + b.height
    ) {
      count++
    }
  }
  for (const e of elites) {
    if (
      e.active &&
      e.body.x >= b.x &&
      e.body.x <= b.x + b.width &&
      e.body.y >= b.y &&
      e.body.y <= b.y + b.height
    ) {
      count++
    }
  }

  return count
}

// ── 오브젝트 풀에서 비활성 엔티티 찾기 ──

const findInactiveMonster = (
  monsters: readonly MonsterEntity[],
): MonsterEntity | null => {
  for (const m of monsters) {
    if (!m.active) return m
  }
  return null
}

const findInactiveElite = (
  elites: readonly EliteEntity[],
): EliteEntity | null => {
  for (const e of elites) {
    if (!e.active) return e
  }
  return null
}

// ── 스폰 인터페이스 ──

export interface SpawnResult {
  newMonsters: MonsterEntity[]
  newElites: EliteEntity[]
}

/**
 * 존 기반 스폰 업데이트 (매 프레임)
 * @mutates state.zoneStates, 기존 비활성 몬스터/엘리트 재활용
 * @returns 새로 생성된 엔티티 (스토어에 추가 필요)
 */
export const updateZoneSpawn = (
  state: SpawnManagerState,
  timeMs: number,
  cameraX: number,
  cameraY: number,
  cameraW: number,
  cameraH: number,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
): SpawnResult => {
  const result: SpawnResult = { newMonsters: [], newElites: [] }

  // 총 활성 몬스터 상한
  const totalActive =
    monsters.filter((m) => m.active).length +
    elites.filter((e) => e.active).length
  if (totalActive >= MAX_CONCURRENT_MONSTERS) return result

  for (const zone of state.zones) {
    // 카메라 컬링
    if (!isZoneVisible(zone, cameraX, cameraY, cameraW, cameraH)) continue

    const zoneState = state.zoneStates.get(zone.id)
    if (!zoneState) continue

    // 리스폰 딜레이
    if (timeMs - zoneState.lastSpawnTime < zone.respawnDelay) continue

    // 존 내 활성 수 체크
    if (countActiveInZone(zone, monsters, elites) >= zone.maxConcurrent)
      continue

    zoneState.lastSpawnTime = timeMs
    const baseConfig = getMonsterConfigByLevel(zone.monsterLevel)
    const pos = getZoneSpawnPosition(zone)

    // 엘리트 확률
    if (zone.eliteChance > 0 && Math.random() < zone.eliteChance) {
      const mutationIdx = Math.floor(
        Math.random() * ELITE_MUTATION_TYPES.length,
      )
      const mutation = ELITE_MUTATION_TYPES[mutationIdx]!
      const inactive = findInactiveElite(elites)
      if (inactive) {
        eliteReset(inactive, pos.x, pos.y, baseConfig, mutation)
      } else {
        result.newElites.push(createElite(pos.x, pos.y, baseConfig, mutation))
      }
      continue
    }

    // 몬스터 타입 랜덤 선택
    const typeIdx = Math.floor(Math.random() * zone.monsterTypes.length)
    const monsterType = zone.monsterTypes[typeIdx] as MonsterType
    const typedConfig = getMonsterConfigByLevel(zone.monsterLevel, monsterType)

    const inactive = findInactiveMonster(monsters)
    if (inactive) {
      monsterReset(inactive, pos.x, pos.y, typedConfig)
    } else {
      result.newMonsters.push(createMonster(pos.x, pos.y, typedConfig))
    }
  }

  return result
}

// ── 전체 클리어 ──

/** @mutates monsters, elites 배열 내 모든 엔티티 비활성화 */
export const clearAllSpawns = (
  monsters: MonsterEntity[],
  elites: EliteEntity[],
  state: SpawnManagerState,
): void => {
  for (const m of monsters) {
    m.active = false
    m.body.vx = 0
    m.body.vy = 0
  }
  for (const e of elites) {
    e.active = false
    e.body.vx = 0
    e.body.vy = 0
  }
  state.zones = []
  state.zoneStates.clear()
}
