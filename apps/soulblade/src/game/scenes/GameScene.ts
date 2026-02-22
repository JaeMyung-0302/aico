import Phaser from 'phaser'
import type { CharacterClass, CharacterStats } from '@soulblade/shared'
import type { Equipment, MapId, StatAllocationData } from '@soulblade/shared'
import type { PassiveSkillId } from '@soulblade/shared'
import { STAT_POINTS_PER_LEVEL, STAT_POINT_VALUES, CLASS_CONFIGS, calcExpForLevel } from '@soulblade/shared'
import { Player } from '../entities/Player'
import { Monster } from '../entities/Monster'
import { Projectile } from '../entities/Projectile'
import { EliteMonster } from '../entities/EliteMonster'
import { MapManager } from '../systems/map-manager'
import { SHOP_ITEMS, FORGE_RECIPES } from '../data/npc-shop-items'
import { applyMovement } from '../systems/movement'
import {
  createCombatState,
  processAttack,
  processEnemyDamage,
  processProjectileHit,
} from '../systems/combat'
import { ZoneSpawnManager } from '../systems/spawn-zone'
import { calcTotalEquipmentStats } from '../systems/synergy'
import { createEventState, checkEventTrigger, type MerchantItem } from '../systems/events'
import { createLodState, updateLod, getLodConfig } from '../systems/lod'
import { VisualFxManager } from '../systems/visual-fx'
import { initAudio, playBgm, stopBgm, BGM_KEYS } from '../systems/audio'
import { useRunStore } from '@/stores/useRunStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { eventBus } from '@/lib/event-bus'
import { CAMERA_LERP, CAMERA_DEADZONE_X, CAMERA_DEADZONE_Y, DEATH_EXP_PENALTY } from '@soulblade/shared'

export class GameScene extends Phaser.Scene {
  private player!: Player
  enemies!: Phaser.Physics.Arcade.Group
  eliteGroup!: Phaser.Physics.Arcade.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private mapManager!: MapManager
  private zoneSpawnManager!: ZoneSpawnManager
  private combatState = createCombatState()
  private eventState = createEventState()
  private lodState = createLodState()
  private visualFx!: VisualFxManager

  // 현재 상인 아이템 (상인 이벤트 시 보관)
  private currentMerchantItems: readonly MerchantItem[] = []

  // 조이스틱 입력
  private joystick = { x: 0, y: 0 }

  // 타이머
  private elapsedSeconds = 0
  private timerEvent: Phaser.Time.TimerEvent | null = null

  // 설정
  private initialMapId: MapId = 'town'
  private classType: CharacterClass = 'Warrior'
  private permanentStats: Partial<CharacterStats> = {}
  private equippedItems: readonly Equipment[] = []
  private characterName = ''

  // 골드
  private gold = 0
  private prevKillCount = 0

  // 리스너 등록 여부 (restart 시 중복 방지)
  private listenersRegistered = false
  private deathEmitted = false

  constructor() {
    super({ key: 'GameScene' })
  }

  init(): void {
    if (!this.listenersRegistered) {
      this.setupEventListeners()
      this.listenersRegistered = true
    }
  }

  create(): void {
    // 상태 초기화
    this.combatState = createCombatState()
    this.eventState = createEventState()
    this.lodState = createLodState()
    this.currentMerchantItems = []
    this.elapsedSeconds = 0
    this.joystick = { x: 0, y: 0 }
    this.deathEmitted = false

    // 스토어에서 초기 설정 읽기 (game:start 이벤트가 씬 생성 전에 발생하여 유실되는 경우 대비)
    // 우선순위: 1) game:start 이벤트 (씬 재시작) → 2) useRunStore (첫 진입) → 3) useSaveStore (fallback)
    const runState = useRunStore.getState()
    const saveInit = useSaveStore.getState()
    if (runState.classType !== null) {
      this.classType = runState.classType
    } else if (saveInit.loaded && saveInit.classLocked) {
      this.classType = saveInit.characterClass
    }
    if (saveInit.loaded) {
      this.initialMapId = saveInit.currentMapId
    }
    // characterName: game:start 이벤트 → useSaveStore fallback
    if (!this.characterName && saveInit.loaded && saveInit.characterName) {
      this.characterName = saveInit.characterName
    }

    // MapManager 초기화
    this.mapManager = new MapManager(this)

    // 플레이어 생성 (맵 스폰 포인트에서)
    const mapConfig = this.mapManager.getCurrentMapConfig()
    this.player = new Player(
      this,
      mapConfig.playerSpawn.x,
      mapConfig.playerSpawn.y,
      this.classType,
      this.permanentStats,
      this.characterName || undefined,
    )

    // 장비 스탯 반영
    if (this.equippedItems.length > 0) {
      const equipStats = calcTotalEquipmentStats(this.equippedItems)
      this.player.weaponPower = equipStats.weaponPower
      if (equipStats.atk) this.player.atk += equipStats.atk
      if (equipStats.def) this.player.def += equipStats.def
      if (equipStats.hp) {
        this.player.maxHp += equipStats.hp
        this.player.hp += equipStats.hp
      }
      if (equipStats.spd) this.player.spd += equipStats.spd
      if (equipStats.crit) this.player.crit += equipStats.crit
      if (equipStats.critDmg) this.player.critDmg += equipStats.critDmg
    }

    // 시각 이펙트 매니저 초기화 + combat 연동
    this.visualFx = new VisualFxManager(this)
    this.combatState.visualFx = this.visualFx

    // 맵 로드 (장애물 + 포탈 + NPC 생성, 카메라 바운드 설정)
    this.mapManager.loadMap(this.initialMapId, this.player)

    // 시각 이펙트: 맵 로드 + 플레이어 섀도우
    const initMapConfig = this.mapManager.getCurrentMapConfig()
    this.visualFx.onMapLoad(this.initialMapId, initMapConfig.worldSize.width, initMapConfig.worldSize.height, this.combatState.juicy.parallaxLayers)
    this.visualFx.attachPlayerShadow(this.player)

    // 카메라: 플레이어 추적 + 데드존
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP)
    this.cameras.main.setDeadzone(CAMERA_DEADZONE_X, CAMERA_DEADZONE_Y)

    // 몬스터 그룹 (Object Pool)
    this.enemies = this.physics.add.group({
      classType: Monster,
      runChildUpdate: false,
    })

    // 엘리트 몬스터 그룹
    this.eliteGroup = this.physics.add.group({
      classType: EliteMonster,
      runChildUpdate: false,
    })

    // 존 기반 스폰 매니저
    this.zoneSpawnManager = new ZoneSpawnManager(this, this.enemies, this.eliteGroup)
    this.zoneSpawnManager.registerZones(this.mapManager.getZones())

    // 투사체 그룹 (Object Pool)
    this.projectiles = this.physics.add.group({
      classType: Projectile,
      runChildUpdate: false,
    })

    // 물리 충돌: 플레이어 ↔ 몬스터
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onPlayerEnemyCollide as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )

    // 물리 충돌: 투사체 ↔ 몬스터
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.onProjectileEnemyCollide as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )

    // 물리 충돌: 플레이어 ↔ 엘리트
    this.physics.add.overlap(
      this.player,
      this.eliteGroup,
      this.onPlayerEliteCollide as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )

    // 물리 충돌: 투사체 ↔ 엘리트
    this.physics.add.overlap(
      this.projectiles,
      this.eliteGroup,
      this.onProjectileEliteCollide as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )

    // 장애물 ↔ 몬스터/엘리트 충돌 (플레이어↔장애물은 mapManager.loadMap에서 처리)
    const obstacles = this.mapManager.getObstacles()
    if (obstacles) {
      this.physics.add.collider(this.enemies, obstacles)
      this.physics.add.collider(this.eliteGroup, obstacles)
    }

    // 타이머 (안전지대에서는 비활성화)
    if (!this.mapManager.isSafeZone()) {
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.onSecondElapsed,
        callbackScope: this,
        loop: true,
      })
    }

    // 세이브 데이터에서 레벨/경험치/전투 스탯/골드 복원
    const saveState = useSaveStore.getState()
    if (saveState.loaded && saveState.characterLevel > 1) {
      this.player.level = saveState.characterLevel
      this.player.exp = saveState.characterExp
      this.player.expToNext = calcExpForLevel(saveState.characterLevel)

      // 전투 스탯 복원 (레벨업·상점·대장간 보너스 포함)
      const saved = saveState.characterStats
      this.player.maxHp = saved.hp
      this.player.hp = saved.hp
      this.player.atk = saved.atk
      this.player.def = saved.def
      this.player.spd = saved.spd
      this.player.crit = saved.crit
      this.player.critDmg = saved.critDmg
    }
    this.gold = saveState.loaded ? saveState.gold : 0

    // 오디오 초기화 + BGM 재생
    initAudio(this)
    const bgmKey = BGM_KEYS[this.initialMapId]
    if (bgmKey) playBgm(bgmKey)

    // 초기 스탯 전달
    this.player.emitStatsUpdate()
    eventBus.emit('hud:gold', { gold: this.gold })
  }

  update(time: number, delta: number): void {
    // 사망 감지: Player가 비활성화되면 death 이벤트 emit
    if (!this.player.active) {
      if (!this.deathEmitted) {
        this.deathEmitted = true
        if (this.timerEvent) this.timerEvent.destroy()
        eventBus.emit('player:death', {
          survivedSeconds: this.elapsedSeconds,
          score: this.combatState.killCount,
        })
      }
      return
    }

    // LOD 품질 업데이트
    const fps = this.game.loop.actualFps
    const quality = updateLod(this.lodState, fps, time)
    this.combatState.juicy = getLodConfig(quality)

    // 시각 이펙트 업데이트 (섀도우 동기화 등)
    this.visualFx.update(this.combatState.juicy, this.player, this.enemies, this.eliteGroup, this.cameras.main, delta)

    // 이동
    applyMovement(this.player, this.joystick)

    // 이름 라벨 위치 동기화
    this.player.updateLabel()

    // 무적 타이머
    this.player.updateInvincibility(delta)

    // holy_shield 패시브 타이머
    this.player.updateHolyShield(delta)

    // 존 기반 스폰 (안전지대 제외)
    if (!this.mapManager.isSafeZone()) {
      this.zoneSpawnManager.update(time)
    }

    // 킬 기반 골드 획득
    if (this.combatState.killCount > this.prevKillCount) {
      const kills = this.combatState.killCount - this.prevKillCount
      this.prevKillCount = this.combatState.killCount
      this.awardGoldForKills(kills)
    }

    // frozen_aura 패시브: 150px 내 적 slow
    const frozenLevel = this.player.passiveSkills.get('frozen_aura') ?? 0
    if (frozenLevel > 0) {
      const slowPercent = frozenLevel * 0.15
      const allMonsterGroups = [this.enemies, this.eliteGroup]
      for (const group of allMonsterGroups) {
        for (const child of group.getChildren()) {
          const monster = child as Monster
          if (!monster.active) continue
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.x, monster.y)
          if (dist <= 150) {
            monster.applySlow(slowPercent)
          }
        }
      }
    }

    // 몬스터 AI + 효과 업데이트
    const hpBarsEnabled = this.combatState.juicy.enableHpBars
    for (const child of this.enemies.getChildren()) {
      const monster = child as Monster
      if (monster.active) {
        monster.updateEffects(delta, hpBarsEnabled)
        monster.chasePlayer(this.player.x, this.player.y)
        monster.slowMultiplier = 0 // chasePlayer 이후 리셋 (다음 프레임에 frozen_aura가 재적용)
      }
    }

    // 엘리트 AI + 효과 업데이트
    for (const child of this.eliteGroup.getChildren()) {
      const elite = child as EliteMonster
      if (elite.active) {
        elite.updateEffects(delta, hpBarsEnabled)
        elite.chasePlayer(this.player.x, this.player.y)
        elite.slowMultiplier = 0
      }
    }

    // 투사체 업데이트
    for (const child of this.projectiles.getChildren()) {
      const proj = child as Projectile
      if (proj.active) {
        proj.update(time, delta)
      }
    }
  }

  // 이벤트 핸들러 (참조 유지용 화살표 함수)
  private onJoystick = (data: { x: number; y: number }): void => {
    this.joystick = { x: data.x, y: data.y }
  }

  // A키 수동 공격
  private onAttack = (): void => {
    if (!this.player?.active) return
    if (this.scene.isPaused()) return

    processAttack(
      this.player,
      this.enemies,
      this.projectiles,
      this.combatState,
      this.time.now,
      [this.eliteGroup],
    )
  }

  private onGameStart = (data: {
    mapId: MapId
    classType: CharacterClass
    stats: CharacterStats
    equippedItems: readonly Equipment[]
    characterName?: string
  }): void => {
    this.initialMapId = data.mapId
    this.classType = data.classType
    this.permanentStats = data.stats
    this.equippedItems = data.equippedItems
    this.characterName = data.characterName ?? ''
    stopBgm()
    this.scene.restart()
  }

  private onGamePause = (): void => {
    this.scene.pause()
  }

  private onGameResume = (): void => {
    this.scene.resume()
  }

  private onGameRevive = (data: { hpPercent: number; applyDeathPenalty?: boolean }): void => {
    // 사망 페널티: 경험치 감소
    if (data.applyDeathPenalty) {
      const penalty = Math.floor(this.player.exp * DEATH_EXP_PENALTY)
      this.player.exp = Math.max(0, this.player.exp - penalty)
    }
    this.player.hp = Math.floor(this.player.maxHp * data.hpPercent)
    this.player.setActive(true).setVisible(true)
    this.deathEmitted = false
    this.player.emitStatsUpdate()
  }

  private onSkillSelected = (data: { skillId: PassiveSkillId }): void => {
    const currentLevel = this.player.passiveSkills.get(data.skillId) ?? 0
    this.player.addPassiveSkill(data.skillId, currentLevel + 1)
  }

  // 스탯 배분 처리 (game:resume는 React 측에서 emit)
  private onStatAllocate = (data: StatAllocationData): void => {
    this.player.allocateStats(data)
  }

  // UI에서 전체 스탯 요청 시
  private onRequestStats = (): void => {
    const skills: Array<{ id: PassiveSkillId; level: number }> = []
    for (const [id, level] of this.player.passiveSkills) {
      skills.push({ id, level })
    }
    eventBus.emit('player:fullStats', {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      atk: this.player.atk,
      def: this.player.def,
      spd: this.player.spd,
      crit: this.player.crit,
      critDmg: this.player.critDmg,
      level: this.player.level,
      gold: this.gold,
      passiveSkills: skills,
    })
  }

  private onMerchantSelect = (data: { itemIndex: number }): void => {
    const item = this.currentMerchantItems[data.itemIndex]
    if (!item) return

    switch (item.effect) {
      case 'heal': {
        const healAmount = Math.floor(this.player.maxHp * item.value)
        this.player.hp = Math.min(this.player.hp + healAmount, this.player.maxHp)
        break
      }
      case 'atk_boost':
        this.player.atk = Math.floor(this.player.atk * (1 + item.value))
        break
      case 'spd_boost':
        this.player.spd = Math.floor(this.player.spd * (1 + item.value))
        break
      case 'shield':
        this.player.setInvincible(item.value)
        break
    }

    this.player.emitStatsUpdate()
    this.currentMerchantItems = []
  }

  // 포탈 확인 → 맵 전환
  private onPortalConfirm = (data: { targetMapId: MapId }): void => {
    const targetConfig = this.mapManager.getCurrentMapConfig()
    const portalConfig = targetConfig.portals.find(
      (p) => p.targetMapId === data.targetMapId,
    ) ?? this.findPortalToTarget(data.targetMapId)

    if (!portalConfig) return

    // 몬스터 전부 제거
    this.zoneSpawnManager.clearAll()

    // BGM 정지
    stopBgm()

    // 시각 이펙트: 기존 맵 정리
    this.visualFx.onMapUnload()

    // 기존 맵 언로드
    this.mapManager.unloadMap()

    // 새 맵 로드
    this.mapManager.loadMap(data.targetMapId, this.player)

    // 시각 이펙트: 새 맵 로드
    const newMapConfig = this.mapManager.getCurrentMapConfig()
    this.visualFx.onMapLoad(data.targetMapId, newMapConfig.worldSize.width, newMapConfig.worldSize.height, this.combatState.juicy.parallaxLayers)

    // 새 맵 BGM 재생
    const newBgmKey = BGM_KEYS[data.targetMapId]
    if (newBgmKey) playBgm(newBgmKey)

    // 플레이어를 포탈 지정 스폰 포인트로 이동
    this.player.setPosition(portalConfig.targetSpawnPoint.x, portalConfig.targetSpawnPoint.y)

    // 장애물 ↔ 몬스터/엘리트 충돌 재등록
    const newObstacles = this.mapManager.getObstacles()
    if (newObstacles) {
      this.physics.add.collider(this.enemies, newObstacles)
      this.physics.add.collider(this.eliteGroup, newObstacles)
    }

    // 존 스폰 재등록
    this.zoneSpawnManager.registerZones(this.mapManager.getZones())

    // 타이머 토글: SafeZone 진입 시 파괴, 사냥터 진입 시 생성
    if (this.mapManager.isSafeZone()) {
      if (this.timerEvent) {
        this.timerEvent.destroy()
        this.timerEvent = null
      }
      this.elapsedSeconds = 0
      eventBus.emit('hud:timer', { seconds: 0 })
    } else if (!this.timerEvent) {
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.onSecondElapsed,
        callbackScope: this,
        loop: true,
      })
    }

    // 맵 전환 시 자동 저장
    eventBus.emit('save:request')

    // 게임 재개
    this.scene.resume()
  }

  // 포탈 취소 → 게임 재개
  private onPortalCancel = (): void => {
    this.scene.resume()
  }

  // 현재 맵에서 targetMapId로 가는 포탈 찾기
  private findPortalToTarget = (targetMapId: MapId) => {
    const config = this.mapManager.getCurrentMapConfig()
    return config.portals.find((p) => p.targetMapId === targetMapId) ?? null
  }

  // 킬 보상 골드
  private awardGoldForKills = (kills: number): void => {
    const zone = this.mapManager.getZoneAt(this.player.x, this.player.y)
    const goldPerKill = zone ? 5 + zone.monsterLevel * 2 : 10

    // gold_boost 패시브 적용
    const goldBoostLevel = this.player.passiveSkills.get('gold_boost') ?? 0
    const boostedGold = Math.floor(goldPerKill * kills * (1 + goldBoostLevel * 0.15))

    this.gold += boostedGold
    eventBus.emit('hud:gold', { gold: this.gold })
  }

  // NPC 닫기 → 리스폰 위치로 이동 + 게임 재개
  private onNpcClose = (): void => {
    const spawn = this.mapManager.getCurrentMapConfig().playerSpawn
    this.player.setPosition(spawn.x, spawn.y)
    this.scene.resume()
  }

  // NPC 상점 구매
  private onNpcBuy = (data: { itemId: string; cost: number }): void => {
    if (this.gold < data.cost) return
    this.gold -= data.cost

    const item = SHOP_ITEMS.find((i) => i.id === data.itemId)
    if (!item) return

    // HP 효과는 즉시 회복, 나머지는 영구 스탯 증가
    if (item.effect.hp) {
      this.player.hp = Math.min(this.player.hp + item.effect.hp, this.player.maxHp)
    }
    if (item.effect.atk) this.player.atk += item.effect.atk
    if (item.effect.def) this.player.def += item.effect.def
    if (item.effect.spd) this.player.spd += item.effect.spd

    this.player.emitStatsUpdate()
    eventBus.emit('hud:gold', { gold: this.gold })
  }

  // NPC 대장간 강화
  private onNpcForge = (data: { equipmentId: string; cost: number }): void => {
    if (this.gold < data.cost) return
    this.gold -= data.cost

    const recipe = FORGE_RECIPES.find((r) => r.id === data.equipmentId)
    if (!recipe) return

    if (recipe.statBoost.hp) this.player.maxHp += recipe.statBoost.hp
    if (recipe.statBoost.atk) this.player.atk += recipe.statBoost.atk
    if (recipe.statBoost.def) this.player.def += recipe.statBoost.def
    if (recipe.statBoost.spd) this.player.spd += recipe.statBoost.spd
    if (recipe.statBoost.crit) this.player.crit += recipe.statBoost.crit

    this.player.emitStatsUpdate()
    eventBus.emit('hud:gold', { gold: this.gold })
  }

  private setupEventListeners(): void {
    eventBus.on('input:joystick', this.onJoystick)
    eventBus.on('input:attack', this.onAttack)
    eventBus.on('game:start', this.onGameStart)
    eventBus.on('game:pause', this.onGamePause)
    eventBus.on('game:resume', this.onGameResume)
    eventBus.on('game:revive', this.onGameRevive)
    eventBus.on('skill:selected', this.onSkillSelected)
    eventBus.on('stat:allocate', this.onStatAllocate)
    eventBus.on('ui:requestStats', this.onRequestStats)
    eventBus.on('event:merchant:select', this.onMerchantSelect)
    eventBus.on('portal:confirm', this.onPortalConfirm)
    eventBus.on('portal:cancel', this.onPortalCancel)
    eventBus.on('npc:close', this.onNpcClose)
    eventBus.on('npc:buy', this.onNpcBuy)
    eventBus.on('npc:forge', this.onNpcForge)
  }

  private onSecondElapsed = (): void => {
    this.elapsedSeconds += 1
    eventBus.emit('hud:timer', { seconds: this.elapsedSeconds })

    // 이벤트 타임 체크 (7분/12분)
    checkEventTrigger(this.eventState, this.elapsedSeconds)
  }

  // --- 충돌 핸들러 ---

  private onPlayerEnemyCollide = (
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void => {
    const monster = enemy as unknown as Monster
    if (!monster.active) return
    processEnemyDamage(this.player, monster, this.combatState)
  }

  private onProjectileEnemyCollide = (
    proj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void => {
    const projectile = proj as unknown as Projectile
    const monster = enemy as unknown as Monster
    if (!projectile.active || !monster.active) return
    processProjectileHit(projectile, monster, this.combatState, this.player)
  }

  private onPlayerEliteCollide = (
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void => {
    const elite = enemy as unknown as Monster
    if (!elite.active) return
    processEnemyDamage(this.player, elite, this.combatState)
  }

  private onProjectileEliteCollide = (
    proj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void => {
    const projectile = proj as unknown as Projectile
    const elite = enemy as unknown as Monster
    if (!projectile.active || !elite.active) return
    processProjectileHit(projectile, elite, this.combatState, this.player)
  }

  shutdown(): void {
    eventBus.off('input:joystick', this.onJoystick)
    eventBus.off('input:attack', this.onAttack)
    eventBus.off('game:start', this.onGameStart)
    eventBus.off('game:pause', this.onGamePause)
    eventBus.off('game:resume', this.onGameResume)
    eventBus.off('game:revive', this.onGameRevive)
    eventBus.off('skill:selected', this.onSkillSelected)
    eventBus.off('stat:allocate', this.onStatAllocate)
    eventBus.off('ui:requestStats', this.onRequestStats)
    eventBus.off('event:merchant:select', this.onMerchantSelect)
    eventBus.off('portal:confirm', this.onPortalConfirm)
    eventBus.off('portal:cancel', this.onPortalCancel)
    eventBus.off('npc:close', this.onNpcClose)
    eventBus.off('npc:buy', this.onNpcBuy)
    eventBus.off('npc:forge', this.onNpcForge)
    this.listenersRegistered = false
    if (this.timerEvent) {
      this.timerEvent.destroy()
    }
    if (this.zoneSpawnManager) {
      this.zoneSpawnManager.clearAll()
    }
    stopBgm()
    if (this.visualFx) {
      this.visualFx.destroy()
    }
    if (this.mapManager) {
      this.mapManager.destroy()
    }
  }
}
