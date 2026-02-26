/**
 * R3F 메인 게임 루프
 * Phaser GameScene.update() 대체 — useFrame() 기반
 *
 * Phase 2: 플레이어 + 몬스터 AI + 전투 + 스폰 + 이펙트
 * Phase 3: 맵 시스템 (포탈/NPC/장애물 충돌)
 */

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { WORLD_WIDTH, WORLD_HEIGHT, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, calcDamage, CLASS_CONFIGS, BASE_ATTACK_COOLDOWN } from '@soulblade/shared'
import type { StatAllocationData } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { useEntityStore } from '../stores/useEntityStore'
import { applyMovementR3F } from '../systems/movement-r3f'
import { physicsStep, clampToWorldBounds, distanceBetween, checkAABB } from '../physics/aabb'
import { createLodState, updateLod } from '../systems/lod'
import { useLodStore } from '../stores/useLodStore'
import { monsterChasePlayer, monsterUpdateEffects } from '../data/monster-data'
import { eliteChasePlayer, eliteUpdateEffects } from '../data/elite-data'
import { bossUpdateAI, bossUpdateEffects } from '../data/boss-data'
import { playerUpdateHolyShield, playerUpdateInvincibility, playerTakeDamage, playerAllocateStats } from '../data/player-data'
import { updateProjectile } from '../data/projectile-data'
import { monsterTakeDamage } from '../data/monster-data'
import { eliteTakeDamage } from '../data/elite-data'
import { createCombatState, processAttackR3F, processProjectileHitR3F, handleKill } from '../systems/combat-r3f'
import { createSpawnManagerState, updateZoneSpawn, registerZones, clearAllSpawns } from '../systems/spawn-r3f'
import { createMapState, switchMap, checkPortalCollision, checkNpcCollision, resolveObstacleCollisions, updateMapCooldowns, setNpcCooldown, setPortalCooldown } from '../systems/map-r3f'
import { createProjectile, fireProjectile } from '../data/projectile-data'
import { MAP_CONFIGS } from '../data/maps'
import type { PlayerEntity, WorldBounds } from '../types'
import type { MapId } from '@soulblade/shared'

interface JoystickInput {
  x: number
  y: number
}

interface GameState {
  paused: boolean
  joystick: JoystickInput
  worldBounds: WorldBounds
  attackRequested: boolean
  elapsedSeconds: number
  lastSecondTime: number
  isSafeZone: boolean
}

export const GameLoop = () => {
  const stateRef = useRef<GameState>({
    paused: false,
    joystick: { x: 0, y: 0 },
    worldBounds: { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT },
    attackRequested: false,
    elapsedSeconds: 0,
    lastSecondTime: 0,
    isSafeZone: true,
  })
  const lodRef = useRef(createLodState())
  const combatRef = useRef(createCombatState())
  const spawnRef = useRef(createSpawnManagerState())
  const mapRef = useRef(createMapState())
  const elapsedMsRef = useRef(0)
  const pendingPortalSpawnRef = useRef<{ x: number; y: number } | null>(null)

  // eventBus 이벤트 리스너 등록
  useEffect(() => {
    const onJoystick = (data: { x: number; y: number }) => {
      stateRef.current.joystick = data
    }
    const onPause = () => {
      stateRef.current.paused = true
    }
    const onResume = () => {
      stateRef.current.paused = false
    }
    const onAttack = () => {
      stateRef.current.attackRequested = true
    }
    const onStatAllocate = (data: StatAllocationData) => {
      const player = useEntityStore.getState().player
      if (player) {
        playerAllocateStats(player, data)
      }
    }
    const onGameStart = (data: { mapId: string }) => {
      // 맵 상태를 실제 시작 맵으로 동기화 (새로고침 시 town 기본값 보정)
      const mapId = data.mapId as MapId
      const config = switchMap(mapRef.current, mapId)
      stateRef.current.isSafeZone = config.isSafeZone
      stateRef.current.worldBounds = { x: 0, y: 0, width: config.worldSize.width, height: config.worldSize.height }
      registerZones(spawnRef.current, config.zones)
      stateRef.current.elapsedSeconds = 0
      stateRef.current.lastSecondTime = 0
      combatRef.current.killCount = 0
      combatRef.current.lastAttackTime = -Infinity
    }
    const onPortalConfirm = (data: { targetMapId: string }) => {
      // 맵 전환: 기존 몬스터 클리어 + 맵 상태 갱신 + 존 재등록
      const { monsters, elites } = useEntityStore.getState()
      clearAllSpawns(monsters, elites, spawnRef.current)
      const config = switchMap(mapRef.current, data.targetMapId as MapId)
      stateRef.current.isSafeZone = config.isSafeZone
      stateRef.current.worldBounds = { x: 0, y: 0, width: config.worldSize.width, height: config.worldSize.height }
      registerZones(spawnRef.current, config.zones)
      stateRef.current.elapsedSeconds = 0
      stateRef.current.lastSecondTime = 0
      combatRef.current.killCount = 0
      combatRef.current.lastAttackTime = -Infinity

      // 플레이어 위치를 포탈 대상 스폰 포인트로 이동
      const player = useEntityStore.getState().player
      const spawn = pendingPortalSpawnRef.current ?? config.playerSpawn
      if (player) {
        player.body.x = spawn.x
        player.body.y = spawn.y
        player.body.vx = 0
        player.body.vy = 0
      }
      pendingPortalSpawnRef.current = null
    }
    const onPortalCancel = () => {
      pendingPortalSpawnRef.current = null
    }
    const onRequestStats = () => {
      const player = useEntityStore.getState().player
      if (!player) return
      eventBus.emit('player:fullStats', {
        hp: player.hp,
        maxHp: player.maxHp,
        atk: player.atk,
        def: player.def,
        spd: player.spd,
        crit: player.crit,
        critDmg: player.critDmg,
        level: player.level,
        gold: combatRef.current.gold,
        passiveSkills: Array.from(player.passiveSkills.entries()).map(([id, level]) => ({ id, level })),
      })
    }
    // 초기 맵 존 등록 (town)
    const initialConfig = MAP_CONFIGS[mapRef.current.currentMapId]
    registerZones(spawnRef.current, initialConfig.zones)
    stateRef.current.isSafeZone = initialConfig.isSafeZone

    eventBus.on('input:joystick', onJoystick)
    eventBus.on('game:pause', onPause)
    eventBus.on('game:resume', onResume)
    eventBus.on('input:attack', onAttack)
    eventBus.on('stat:allocate', onStatAllocate)
    eventBus.on('game:start', onGameStart)
    eventBus.on('portal:confirm', onPortalConfirm)
    eventBus.on('portal:cancel', onPortalCancel)
    eventBus.on('ui:requestStats', onRequestStats)

    return () => {
      eventBus.off('input:joystick', onJoystick)
      eventBus.off('game:pause', onPause)
      eventBus.off('game:resume', onResume)
      eventBus.off('input:attack', onAttack)
      eventBus.off('stat:allocate', onStatAllocate)
      eventBus.off('game:start', onGameStart)
      eventBus.off('portal:confirm', onPortalConfirm)
      eventBus.off('portal:cancel', onPortalCancel)
      eventBus.off('ui:requestStats', onRequestStats)
    }
  }, [])

  // 메인 게임 루프 (60fps)
  useFrame((_state, delta) => {
    if (stateRef.current.paused) return

    const deltaClamped = Math.min(delta, 0.05) // 50ms 상한 (20fps 최저)
    const deltaMs = deltaClamped * 1000
    elapsedMsRef.current += deltaMs
    const timeMs = elapsedMsRef.current
    const store = useEntityStore.getState()
    const player = store.player
    if (!player || !player.active) return

    // 1. LOD 업데이트
    const fps = 1 / delta
    const newQuality = updateLod(lodRef.current, fps, timeMs)
    useLodStore.getState().setQuality(newQuality)

    // 2. 플레이어 이동 적용
    applyMovementR3F(player.body, stateRef.current.joystick, player.spd)

    // 3. 플레이어 물리 스텝 + 월드 바운드 + 장애물 충돌
    physicsStep(player.body, deltaClamped)
    clampToWorldBounds(player.body, stateRef.current.worldBounds)
    resolveObstacleCollisions(mapRef.current, player.body)

    // 3.5. 맵 쿨다운 업데이트 + 포탈/NPC 충돌 체크
    updateMapCooldowns(mapRef.current, deltaMs)

    const portal = checkPortalCollision(mapRef.current, player.body.x, player.body.y)
    if (portal) {
      setPortalCooldown(mapRef.current)
      pendingPortalSpawnRef.current = portal.targetSpawnPoint
      eventBus.emit('portal:enter', {
        portalId: portal.id,
        targetMapId: portal.targetMapId,
        targetSpawnPoint: portal.targetSpawnPoint,
        recommendedLevel: portal.recommendedLevel,
        label: portal.label,
      })
    }

    const npc = checkNpcCollision(mapRef.current, player.body.x, player.body.y)
    if (npc) {
      setNpcCooldown(mapRef.current)
      eventBus.emit('npc:interact', {
        npcId: npc.id,
        npcType: npc.type,
        label: npc.label,
      })
    }

    // 4. facing angle 갱신
    /** @mutates player.facingAngle */
    const { x: jx, y: jy } = stateRef.current.joystick
    if (jx !== 0 || jy !== 0) {
      player.facingAngle = Math.atan2(jy, jx)
    }

    // 5. 플레이어 타이머 업데이트
    playerUpdateInvincibility(player, deltaMs)
    playerUpdateHolyShield(player, deltaMs)

    // 5.5. 공격 모션 타이머 (isAttacking → false 복귀)
    if (player.isAttacking) {
      player.attackTimer -= deltaMs
      if (player.attackTimer <= 0) {
        player.isAttacking = false
        player.attackTimer = 0
      }
    }

    // 11. 공격 요청 소비 (안전지대 여부 무관)
    if (stateRef.current.attackRequested) {
      stateRef.current.attackRequested = false

      const cdrLevel = player.passiveSkills.get('cooldown_reduction') ?? 0
      const atkSpdLevel = player.passiveSkills.get('attack_speed_up') ?? 0
      const cooldown = (BASE_ATTACK_COOLDOWN * 1000)
        * Math.max(0.2, 1 - cdrLevel * 0.08)
        * Math.max(0.2, 1 - atkSpdLevel * 0.1)

      if (timeMs - combatRef.current.lastAttackTime >= cooldown) {
        combatRef.current.lastAttackTime = timeMs
        player.isAttacking = true
        player.attackTimer = player.attackPattern === 'aoe_circle' ? 280 : 200

        eventBus.emit('combat:attack', {
          attackPattern: player.attackPattern,
          x: player.body.x,
          y: player.body.y,
          facingAngle: player.facingAngle,
        })

        // 데미지 처리는 전투 지역에서만
        if (!stateRef.current.isSafeZone) {
          const { monsters, elites } = store
          const projectileInfos = processAttackR3F(player, monsters, elites, combatRef.current)

          // Archer 투사체 생성
          if (projectileInfos) {
            for (const info of projectileInfos) {
              const proj = createProjectile()
              fireProjectile(proj, player.body.x, player.body.y, info.angle, {
                speed: 400,
                damage: info.damage,
                piercing: info.piercing,
                lifetime: 500,
              })
              store.addProjectile(proj)
            }
          }
        }
      }
    }

    // === 전투/스폰 (안전지대가 아닌 경우만) ===
    if (!stateRef.current.isSafeZone) {
      const { monsters, elites, projectiles } = store

      // 6. 스폰 업데이트
      // 카메라 위치 추정 (플레이어 중심)
      const cameraX = player.body.x - VIEWPORT_WIDTH / 2
      const cameraY = player.body.y - VIEWPORT_HEIGHT / 2
      const spawnResult = updateZoneSpawn(
        spawnRef.current,
        timeMs,
        cameraX,
        cameraY,
        VIEWPORT_WIDTH,
        VIEWPORT_HEIGHT,
        monsters,
        elites,
      )

      // 새 엔티티 스토어에 추가
      if (spawnResult.newMonsters.length > 0) {
        store.addMonsters(spawnResult.newMonsters)
      }
      if (spawnResult.newElites.length > 0) {
        store.addElites(spawnResult.newElites)
      }

      // 7. 몬스터 AI + 이펙트 업데이트
      for (const m of monsters) {
        if (!m.active) continue
        monsterChasePlayer(m, player.body.x, player.body.y)
        physicsStep(m.body, deltaClamped)
        clampToWorldBounds(m.body, stateRef.current.worldBounds)
        monsterUpdateEffects(m, deltaMs)
      }

      // 8. 엘리트 AI + 이펙트 업데이트
      for (const e of elites) {
        if (!e.active) continue
        eliteChasePlayer(e, player.body.x, player.body.y)
        physicsStep(e.body, deltaClamped)
        clampToWorldBounds(e.body, stateRef.current.worldBounds)
        eliteUpdateEffects(e, deltaMs)
      }

      // 9. 보스 AI
      const boss = store.boss
      if (boss && boss.active) {
        bossUpdateAI(boss, deltaMs, player.body.x, player.body.y)
        physicsStep(boss.body, deltaClamped)
        clampToWorldBounds(boss.body, stateRef.current.worldBounds)
        bossUpdateEffects(boss, deltaMs)
      }

      // 10. 투사체 업데이트
      for (const p of projectiles) {
        if (!p.active) continue
        physicsStep(p.body, deltaClamped)
        updateProjectile(p, deltaMs, stateRef.current.worldBounds)
      }

      // 12. 적 → 플레이어 충돌 (thorn_armor 포함)
      const thornLevel = player.passiveSkills.get('thorn_armor') ?? 0

      for (const m of monsters) {
        if (!m.active) continue
        if (checkAABB(player.body, m.body)) {
          const damage = calcContactDamage(player, m.atk, m.level)
          if (damage > 0) {
            eventBus.emit('combat:damageNumber', {
              x: player.body.x,
              y: player.body.y,
              damage,
              isCrit: false,
              color: '#ff4444',
            })
            playerTakeDamage(player, damage)

            // thorn_armor 패시브: 접촉 시 적에게 반사 데미지
            if (thornLevel > 0) {
              const killed = monsterTakeDamage(m, thornLevel * 3)
              if (killed) {
                handleKill(player, m.expReward, m.goldReward, combatRef.current, m.body.x, m.body.y)
              }
            }
          }

          if (player.hp <= 0) {
            eventBus.emit('player:death', {
              survivedSeconds: stateRef.current.elapsedSeconds,
              score: combatRef.current.killCount,
            })
            return
          }
        }
      }

      for (const e of elites) {
        if (!e.active) continue
        if (checkAABB(player.body, e.body)) {
          const damage = calcContactDamage(player, e.atk, e.level)
          if (damage > 0) {
            eventBus.emit('combat:damageNumber', {
              x: player.body.x,
              y: player.body.y,
              damage,
              isCrit: false,
              color: '#ff4444',
            })
            playerTakeDamage(player, damage)

            // thorn_armor 패시브: 접촉 시 적에게 반사 데미지
            if (thornLevel > 0) {
              const killed = eliteTakeDamage(e, thornLevel * 3)
              if (killed) {
                handleKill(player, e.expReward, e.goldReward, combatRef.current, e.body.x, e.body.y)
              }
            }
          }

          if (player.hp <= 0) {
            eventBus.emit('player:death', {
              survivedSeconds: stateRef.current.elapsedSeconds,
              score: combatRef.current.killCount,
            })
            return
          }
        }
      }

      // 13. 투사체 → 적 충돌 (몬스터 + 엘리트)
      for (const p of projectiles) {
        if (!p.active) continue

        for (const m of monsters) {
          if (!m.active) continue
          if (checkAABB(p.body, m.body)) {
            processProjectileHitR3F(p, m, player, combatRef.current, monsters, elites)
            if (!p.active) break
          }
        }

        if (!p.active) continue

        for (const e of elites) {
          if (!e.active) continue
          if (checkAABB(p.body, e.body)) {
            processProjectileHitR3F(p, e, player, combatRef.current, monsters, elites)
            if (!p.active) break
          }
        }
      }

      // 14. frozen_aura 패시브: 근처 적 감속 (몬스터 + 엘리트)
      const frozenLevel = player.passiveSkills.get('frozen_aura') ?? 0
      if (frozenLevel > 0) {
        const frozenRange = 150
        const slowPercent = frozenLevel * 0.1

        for (const m of monsters) {
          if (!m.active) continue
          if (distanceBetween(player.body.x, player.body.y, m.body.x, m.body.y) <= frozenRange) {
            m.slowMultiplier = Math.min(slowPercent, 0.8)
          } else {
            m.slowMultiplier = 0
          }
        }

        for (const e of elites) {
          if (!e.active) continue
          if (distanceBetween(player.body.x, player.body.y, e.body.x, e.body.y) <= frozenRange) {
            e.slowMultiplier = Math.min(slowPercent, 0.8)
          } else {
            e.slowMultiplier = 0
          }
        }
      }

      // 15. 경과 시간 동기화 (1초마다)
      if (timeMs - stateRef.current.lastSecondTime >= 1000) {
        stateRef.current.lastSecondTime = timeMs
        stateRef.current.elapsedSeconds += 1
        eventBus.emit('hud:timer', { seconds: stateRef.current.elapsedSeconds })
      }
    }
  })

  return null
}

// 접촉 데미지 계산 헬퍼
const calcContactDamage = (player: PlayerEntity, monsterAtk: number, monsterLevel: number): number => {
  if (player.invincible) return 0

  const dodgeLevel = player.passiveSkills.get('dodge_chance') ?? 0
  if (dodgeLevel > 0 && Math.random() < dodgeLevel * 0.05) return 0

  const passive = CLASS_CONFIGS[player.classType].classPassive
  const rawDamage = calcDamage(monsterAtk, 0, player.def, 1.0, monsterLevel, player.level, 1.0)
  return passive.type === 'damage_reduction'
    ? Math.floor(rawDamage * passive.value)
    : rawDamage
}
