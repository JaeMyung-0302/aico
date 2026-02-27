/**
 * R3F 맵 시스템
 * Phaser map-manager.ts → 순수 함수 기반
 *
 * 맵 전환, 장애물 AABB 충돌, 포탈/NPC 트리거 체크
 * Phaser StaticGroup → PhysicsBody[] 배열
 */

import type {
  MapId,
  WorldMapConfig,
  PortalConfig,
  NpcConfig,
  ObstacleConfig,
} from '@soulblade/shared'
import type { PhysicsBody } from '../types'
import { MAP_CONFIGS } from '../data/maps'

// ── 맵 상태 ──

export interface MapState {
  currentMapId: MapId
  obstacleAABBs: readonly PhysicsBody[] // collidable 장애물의 AABB
  portalCooldown: number // 포탈 재진입 방지 쿨다운 (ms)
  npcCooldown: number // NPC 재상호작용 방지 쿨다운 (ms)
}

export const createMapState = (initialMapId: MapId = 'town'): MapState => ({
  currentMapId: initialMapId,
  obstacleAABBs: buildObstacleAABBs(MAP_CONFIGS[initialMapId].obstacles),
  portalCooldown: 0,
  npcCooldown: 0,
})

// ── 장애물 AABB 생성 ──

const buildObstacleAABBs = (
  obstacles: readonly ObstacleConfig[],
): PhysicsBody[] => {
  const bodies: PhysicsBody[] = []
  for (const obs of obstacles) {
    if (obs.collidable === false) continue
    bodies.push({
      x: obs.x,
      y: obs.y,
      vx: 0,
      vy: 0,
      width: obs.width,
      height: obs.height,
      isStatic: true,
    })
  }
  return bodies
}

// ── 맵 전환 ──

/** @mutates state (currentMapId, obstacleAABBs, cooldowns) */
export const switchMap = (
  state: MapState,
  targetMapId: MapId,
): WorldMapConfig => {
  state.currentMapId = targetMapId
  const config = MAP_CONFIGS[targetMapId]
  state.obstacleAABBs = buildObstacleAABBs(config.obstacles)
  state.portalCooldown = 1000 // 1초 쿨다운
  state.npcCooldown = 0
  return config
}

// ── 현재 맵 설정 조회 ──

export const getCurrentMapConfig = (state: MapState): WorldMapConfig => {
  return MAP_CONFIGS[state.currentMapId]
}

// ── 포탈 충돌 체크 ──

/** 플레이어 위치가 포탈 영역 안에 있는지 체크 */
export const checkPortalCollision = (
  state: MapState,
  playerX: number,
  playerY: number,
): PortalConfig | null => {
  if (state.portalCooldown > 0) return null

  const config = MAP_CONFIGS[state.currentMapId]
  for (const portal of config.portals) {
    const px = portal.position.x
    const py = portal.position.y
    const hw = portal.size.width / 2
    const hh = portal.size.height / 2

    if (
      playerX >= px - hw &&
      playerX <= px + hw &&
      playerY >= py - hh &&
      playerY <= py + hh
    ) {
      return portal
    }
  }
  return null
}

// ── NPC 상호작용 체크 ──

const NPC_INTERACTION_RANGE = 64

/** 플레이어 위치가 NPC 상호작용 범위 안에 있는지 체크 */
export const checkNpcCollision = (
  state: MapState,
  playerX: number,
  playerY: number,
): NpcConfig | null => {
  if (state.npcCooldown > 0) return null

  const config = MAP_CONFIGS[state.currentMapId]
  for (const npc of config.npcs) {
    const dx = playerX - npc.position.x
    const dy = playerY - npc.position.y
    if (dx * dx + dy * dy <= NPC_INTERACTION_RANGE * NPC_INTERACTION_RANGE) {
      return npc
    }
  }
  return null
}

// ── 장애물 충돌 해소 ──

/** 플레이어와 장애물 AABB 충돌 해소 (분리 벡터 적용) */
export const resolveObstacleCollisions = (
  state: MapState,
  body: PhysicsBody,
): void => {
  const hw = body.width / 2
  const hh = body.height / 2

  for (const obs of state.obstacleAABBs) {
    const ohw = obs.width / 2
    const ohh = obs.height / 2

    const dx = body.x - obs.x
    const dy = body.y - obs.y
    const overlapX = hw + ohw - Math.abs(dx)
    const overlapY = hh + ohh - Math.abs(dy)

    if (overlapX <= 0 || overlapY <= 0) continue

    // 최소 분리 축 방향으로 밀어내기
    if (overlapX < overlapY) {
      body.x += dx > 0 ? overlapX : -overlapX
    } else {
      body.y += dy > 0 ? overlapY : -overlapY
    }
  }
}

// ── 쿨다운 업데이트 ──

/** @mutates state.portalCooldown, state.npcCooldown */
export const updateMapCooldowns = (state: MapState, deltaMs: number): void => {
  if (state.portalCooldown > 0) {
    state.portalCooldown = Math.max(0, state.portalCooldown - deltaMs)
  }
  if (state.npcCooldown > 0) {
    state.npcCooldown = Math.max(0, state.npcCooldown - deltaMs)
  }
}

/** 포탈 진입 시 쿨다운 설정 (UI 확인 중 재발행 방지) */
export const setPortalCooldown = (state: MapState): void => {
  state.portalCooldown = 1000
}

/** NPC 상호작용 시 쿨다운 설정 */
export const setNpcCooldown = (state: MapState): void => {
  state.npcCooldown = 1000
}
