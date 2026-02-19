import Phaser from 'phaser'
import type { PlacedUnit, UnitGrade, Element, ActiveDebuff, ActiveBuff, AbilityData, ReactionData } from '@/types'
import { GridManager } from '@/game/systems/GridManager'
import { generateSPath, getPathGridPositions, drawPath } from '@/game/systems/PathSystem'
import { generateTerrainLayout, type TerrainTile } from '@/game/systems/TerrainSystem'
import { generateSpawnList, calculateWaveGold, isArtifactWave, isBossWave, isGameClear, TOTAL_WAVES } from '@/game/systems/WaveSystem'
import { calculateDamage, findTarget } from '@/game/systems/CombatSystem'
import { canMerge, executeMerge } from '@/game/systems/MergeSystem'
import { canEvolve, getEvolutionBranches, evolveUnit } from '@/game/systems/EvolutionSystem'
import { calculateArtifactBonuses, type ArtifactBonuses } from '@/game/systems/ArtifactSystem'
import { updateDebuffs, removeDebuffsForTarget, getEffectiveSpeed, isDisabled, getEffectiveAtkMultiplier, getEffectiveRangeBoost, getDotDamage } from '@/game/systems/DebuffSystem'
import { checkReaction, canReact, recordReaction, clearCooldowns, applyReactionEffect } from '@/game/systems/ReactionSystem'
import { getAbilityForUnit, applyAoe, applyChain, applyPierce, applySlow, applyArmorBreak, findHighestHpTarget, applyPassiveBuffs } from '@/game/systems/AbilitySystem'
import { executeInfernoAbility, executeLeviathanAbility, executeTitanAbility } from '@/game/systems/BossAbilitySystem'
import { getArmorReduction, getRegenRate } from '@/game/data/traits'
import { UNITS, SUMMON_COST, SUMMON_PROBABILITIES, getGradeMultiplier, getUnitById } from '@/game/data/units'
import { getFusionUnit } from '@/game/data/fusions'
import { EnemyEntity } from '@/game/entities/Enemy'
import { BossEntity } from '@/game/entities/Boss'
import { UnitEntity } from '@/game/entities/Unit'
import { Projectile } from '@/game/entities/Projectile'
import { DamageText } from '@/game/entities/DamageText'
import { HeroSystem } from '@/game/systems/HeroSystem'
import type { SkillEffect } from '@/game/systems/HeroSkillSystem'
import { eventBus } from '@/lib/event-bus'

interface AttackCooldown {
  instanceId: string
  lastAttackTime: number
}

export class GameScene extends Phaser.Scene {
  private gridManager!: GridManager
  private terrains: TerrainTile[] = []
  private path: Phaser.Math.Vector2[] = []
  private units: Map<string, UnitEntity> = new Map()
  private placedUnits: PlacedUnit[] = []
  private enemies: EnemyEntity[] = []
  private projectiles: Projectile[] = []
  private attackCooldowns: AttackCooldown[] = []
  private artifactBonuses!: ArtifactBonuses
  private debuffs: ActiveDebuff[] = []
  private buffs: ActiveBuff[] = []
  private lastBuffUpdateTime = 0
  private enemyIdCounter = 0
  private growthBonuses = { atkBonus: 0, maxHpBonus: 0, goldBonus: 0, luckBonus: 0 }
  private dotTickAccumulator = 0
  private heroSystem = new HeroSystem()
  private isEvolutionPaused = false

  // 게임 상태
  private currentWave = 0
  private gold = 30
  private hp = 100
  private maxHp = 100
  private score = 0
  private ownedArtifacts: string[] = []
  private isWaveActive = false
  private waveSpawnTimer?: Phaser.Time.TimerEvent
  private unitIdCounter = 0

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    // 지형 생성
    this.terrains = generateTerrainLayout()

    // 그리드 생성
    this.gridManager = new GridManager(this)
    this.gridManager.createGrid(this.terrains)

    // 적 경로 생성 + 경로 셀 설정
    const { x: gridX, y: gridY } = this.gridManager.getGridStart()
    const slotSize = this.gridManager.getSlotSize()
    this.gridManager.setPathCells(getPathGridPositions())
    this.path = generateSPath(gridX, gridY, slotSize)
    drawPath(this, this.path)

    // 유물 보너스 초기화
    this.artifactBonuses = calculateArtifactBonuses(this.ownedArtifacts)

    // 드래그 & 드롭 설정
    this.setupDragAndDrop()

    // 성장 트리 보너스 수신
    eventBus.on('growth-bonuses', this.handleGrowthBonuses as (...args: unknown[]) => void)

    // 히어로 시스템 초기화 (기본: fire)
    this.heroSystem.init(this, 'fire')

    // UI 이벤트 리스너
    eventBus.on('summon-unit', this.handleSummon)
    eventBus.on('start-wave', this.handleStartWave)
    eventBus.on('select-artifact', this.handleSelectArtifact as (...args: unknown[]) => void)
    eventBus.on('hero-use-skill', this.handleHeroUseSkill as (...args: unknown[]) => void)
    eventBus.on('hero-select-element', this.handleHeroSelectElement as (...args: unknown[]) => void)
    eventBus.on('evolution-select', this.handleEvolutionSelect)
    eventBus.on('evolution-dismiss', this.handleEvolutionDismiss)

    // 초기 상태 전달
    this.emitGameState()

    // UIScene 동시 실행
    this.scene.launch('UIScene')
  }

  update(time: number, delta: number) {
    if (this.isEvolutionPaused) return

    // 디버프 시간 업데이트
    this.debuffs = updateDebuffs(this.debuffs, delta)

    // 패시브 버프 갱신 (매 1초)
    if (time - this.lastBuffUpdateTime > 1000) {
      this.buffs = applyPassiveBuffs(this.placedUnits, [])
      this.lastBuffUpdateTime = time
    }

    // 적 이동 + 도달 체크 + regen + 디버프 시각 효과
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy || enemy.isDead) continue

      // 슬로우 적용된 유효 속도
      const effectiveSpd = getEffectiveSpeed(enemy.speed, enemy.instanceId, this.debuffs)
      const reached = enemy.moveAlongPath(this.path, delta, effectiveSpd)

      // 디버프 + 마킹 시각 효과
      enemy.updateDebuffVisual(effectiveSpd < enemy.speed)
      enemy.updateMarkVisuals(time)

      // regen 특성: 초당 최대HP의 N% 회복
      const regenRate = getRegenRate(enemy.enemyData.traits)
      if (regenRate > 0) {
        const regenAmount = (enemy.maxHp * regenRate * delta) / 1000
        enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + regenAmount)
      }

      if (reached) {
        const damage = enemy.enemyData.type === 'boss' ? 20 : 5
        this.hp = Math.max(0, this.hp - damage)
        this.debuffs = removeDebuffsForTarget(this.debuffs, enemy.instanceId)
        enemy.clearMarks()
        clearCooldowns(enemy.instanceId)
        enemy.playDeathAnimation(() => enemy.destroy())
        this.enemies.splice(i, 1)

        if (this.hp <= 0) {
          this.handleGameOver()
          return
        }
      }
    }

    // DoT 데미지 처리 (500ms 간격)
    this.dotTickAccumulator += delta
    if (this.dotTickAccumulator >= 500) {
      this.dotTickAccumulator -= 500
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        if (!enemy || enemy.isDead) continue
        const dotDps = getDotDamage(enemy.instanceId, this.debuffs)
        if (dotDps > 0) {
          const tickDmg = Math.round(dotDps / 2)
          if (tickDmg > 0 && enemy.takeDamage(tickDmg)) {
            this.handleEnemyKill(enemy)
          }
        }
      }
    }

    // 투사체 업데이트
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      if (!proj) continue
      proj.update(time, delta)
      if (proj.hasReached) {
        proj.destroy()
        this.projectiles.splice(i, 1)
      }
    }

    // 유닛 공격 로직
    if (this.isWaveActive) {
      this.processUnitAttacks(time)
    }

    // 히어로 시스템 업데이트 (자동공격, 피격, 스킬 쿨다운)
    this.heroSystem.update(time, delta, this.enemies)
    this.processHeroSkillEffects()

    // 웨이브 완료 체크
    if (this.isWaveActive && this.enemies.length === 0 && !this.waveSpawnTimer) {
      this.handleWaveComplete()
    }

    // UI 상태 동기화
    this.emitGameState()
  }

  private processUnitAttacks(time: number) {
    const slotSize = this.gridManager.getSlotSize()

    for (const [instanceId, unitEntity] of this.units) {
      const placedUnit = this.placedUnits.find((u) => u.instanceId === instanceId)
      if (!placedUnit) continue

      // 유닛 무력화 체크 (보스 능력 등)
      if (isDisabled(instanceId, this.debuffs)) continue

      // 공격 쿨다운 체크
      const unitData = placedUnit.fusionElement
        ? null
        : getUnitById(placedUnit.unitDataId)
      const atkSpeed = unitData?.atkSpeed ?? 0.8
      const boostedAtkSpeed = atkSpeed * (1 + this.artifactBonuses.atkSpeed)
      const cooldownMs = 1000 / boostedAtkSpeed

      let cooldown = this.attackCooldowns.find((c) => c.instanceId === instanceId)
      if (!cooldown) {
        cooldown = { instanceId, lastAttackTime: 0 }
        this.attackCooldowns.push(cooldown)
      }

      if (time - cooldown.lastAttackTime < cooldownMs) continue

      // 타겟 찾기 (능력에 따라 다른 타겟 선택)
      const worldPos = this.gridManager.getSlotWorldPosition(placedUnit.position)
      if (!worldPos) continue

      const baseRange = unitData?.range ?? 2.0
      const rangeBoost = getEffectiveRangeBoost(instanceId, this.buffs)
      const range = baseRange + rangeBoost

      const ability = placedUnit.fusionElement
        ? { type: 'none' as const, params: {} }
        : getAbilityForUnit(placedUnit.unitDataId)

      // wind-assassin: HP 높은 적 우선 타겟
      const target = ability.type === 'prioritize_hp'
        ? findHighestHpTarget(worldPos.x, worldPos.y, range, slotSize, this.enemies)
        : findTarget(worldPos.x, worldPos.y, range, slotSize, this.enemies)
      if (!target) continue

      // 데미지 계산 (버프 + 성장 보너스 적용)
      const atkMultiplier = getEffectiveAtkMultiplier(instanceId, this.buffs)
      const result = calculateDamage(
        placedUnit,
        target.enemyData,
        this.placedUnits,
        this.terrains,
        this.artifactBonuses,
      )
      const buffedDamage = Math.round(result.damage * atkMultiplier * (1 + this.growthBonuses.atkBonus))

      // 마킹용 원소 결정 (융합 유닛: elements[0])
      const markElement: Element = placedUnit.fusionElement
        ? (getFusionUnit(placedUnit.fusionElement)?.elements[0] ?? 'fire')
        : (unitData?.element ?? 'fire')

      // 투사체 발사
      const element = unitData?.element ?? 'fire'
      const proj = new Projectile(this, worldPos.x, worldPos.y, target.x, target.y, element)
      this.projectiles.push(proj)

      // 공격 애니메이션 + 데미지 텍스트
      unitEntity.playAttackAnimation()
      new DamageText(this, target.x, target.y, buffedDamage, result.elementEffect)

      if (result.elementEffect === 'immune') {
        cooldown.lastAttackTime = time
        continue
      }

      // 쉴드 흡수 체크
      if (target.absorbShieldHit()) {
        new DamageText(this, target.x, target.y, 0, 'neutral')
        cooldown.lastAttackTime = time
        continue
      }

      // armor 감소 + armor_break 디버프 반영
      const armorReduction = getArmorReduction(target.enemyData.traits)
      const finalDamage = Math.round(buffedDamage * (1 - armorReduction))
      const killed = target.takeDamage(finalDamage)

      // 유닛 능력 적용
      this.applyUnitAbility(ability, target, finalDamage, slotSize)

      if (killed) {
        this.handleEnemyKill(target)
      } else {
        // 원소 마킹 + 반응 판정 (살아있는 적만)
        target.applyMark(markElement, time)
        const reaction = checkReaction(target.getActiveMarks(time), time)
        if (reaction && canReact(target.instanceId, reaction.type, time)) {
          this.handleReaction(reaction, target, finalDamage, time)
        }
      }

      cooldown.lastAttackTime = time
    }
  }

  private applyUnitAbility(
    ability: AbilityData,
    target: EnemyEntity,
    damage: number,
    slotSize: number,
  ) {
    switch (ability.type) {
      case 'aoe': {
        const aoeResults = applyAoe(target, damage, ability, this.enemies, slotSize)
        for (const { enemy, aoeDamage } of aoeResults) {
          if (enemy.absorbShieldHit()) continue
          const armorRed = getArmorReduction(enemy.enemyData.traits)
          const finalAoe = Math.round(aoeDamage * (1 - armorRed))
          new DamageText(this, enemy.x, enemy.y, finalAoe, 'neutral')
          const killed = enemy.takeDamage(finalAoe)
          if (killed) this.handleEnemyKill(enemy)
        }
        break
      }
      case 'chain': {
        const chainResult = applyChain(target, damage, ability, this.enemies, slotSize)
        if (chainResult) {
          const { enemy, chainDamage } = chainResult
          if (!enemy.absorbShieldHit()) {
            const armorRed = getArmorReduction(enemy.enemyData.traits)
            const finalChain = Math.round(chainDamage * (1 - armorRed))
            new DamageText(this, enemy.x, enemy.y, finalChain, 'neutral')
            const killed = enemy.takeDamage(finalChain)
            if (killed) this.handleEnemyKill(enemy)
          }
        }
        break
      }
      case 'pierce': {
        const pierceResult = applyPierce(target, damage, ability, this.enemies, slotSize)
        if (pierceResult) {
          const { enemy, pierceDamage } = pierceResult
          if (!enemy.absorbShieldHit()) {
            const armorRed = getArmorReduction(enemy.enemyData.traits)
            const finalPierce = Math.round(pierceDamage * (1 - armorRed))
            new DamageText(this, enemy.x, enemy.y, finalPierce, 'neutral')
            const killed = enemy.takeDamage(finalPierce)
            if (killed) this.handleEnemyKill(enemy)
          }
        }
        break
      }
      case 'slow':
        this.debuffs = applySlow(target.instanceId, ability, this.debuffs)
        break
      case 'debuff_armor':
        this.debuffs = applyArmorBreak(target.instanceId, ability, this.debuffs)
        break
      default:
        break
    }
  }

  private startBossAbilityLoop(boss: BossEntity) {
    const unitPositions = () =>
      this.placedUnits.map((u) => {
        const pos = this.gridManager.getSlotWorldPosition(u.position)
        return { instanceId: u.instanceId, x: pos?.x ?? 0, y: pos?.y ?? 0 }
      })

    switch (boss.enemyData.id) {
      case 'boss-inferno':
        boss.startAbilityLoop(() => {
          this.debuffs = executeInfernoAbility(this, unitPositions(), this.debuffs)
        }, 3000)
        break
      case 'boss-leviathan':
        boss.startAbilityLoop(() => {
          this.debuffs = executeLeviathanAbility(this, boss, unitPositions(), this.enemies, this.debuffs)
        }, 4000)
        break
      case 'boss-titan':
        boss.startAbilityLoop(() => {
          this.debuffs = executeTitanAbility(this, boss, unitPositions(), this.debuffs)
        }, 5000)
        break
      default:
        break
    }
  }

  private handleReaction(reaction: ReactionData, target: EnemyEntity, referenceDamage: number, time: number) {
    const result = applyReactionEffect(reaction, target, referenceDamage, this.enemies, this.debuffs)
    this.debuffs = result.debuffs
    target.clearMarks()
    recordReaction(target.instanceId, reaction.type, time)

    // 반응 데미지 적용
    for (const event of result.damageEvents) {
      new DamageText(this, event.enemy.x, event.enemy.y, event.damage, 'neutral')
      if (event.enemy.takeDamage(event.damage)) {
        this.handleEnemyKill(event.enemy)
      }
    }

    // 반응명 텍스트 + 카메라 흔들림
    DamageText.createReactionText(this, target.x, target.y, reaction.name, reaction.type)
    this.cameras.main.shake(100, 0.005)

    // 이벤트 발행
    eventBus.emit('reaction_triggered', { type: reaction.type, enemyId: target.instanceId })
  }

  private handleEnemyKill(target: EnemyEntity) {
    this.score += target.enemyData.type === 'boss' ? 100 : 10
    const reward = target.enemyData.reward
    const bonusGold = Math.round(reward * (this.artifactBonuses.goldBonus + this.growthBonuses.goldBonus))
    const eliteBonus = target.enemyData.type === 'elite'
      ? Math.round(reward * this.artifactBonuses.eliteBounty)
      : 0
    this.gold += reward + bonusGold + eliteBonus

    // 디버프 + 마킹 + 쿨다운 정리
    this.debuffs = removeDebuffsForTarget(this.debuffs, target.instanceId)
    target.clearMarks()
    clearCooldowns(target.instanceId)

    target.playDeathAnimation(() => {
      const idx = this.enemies.indexOf(target)
      if (idx >= 0) this.enemies.splice(idx, 1)
      target.destroy()
    })
  }

  private handleSummon = () => {
    const cost = Math.max(1, SUMMON_COST - this.artifactBonuses.summonDiscount)
    if (this.gold < cost) return

    // 빈 슬롯 찾기
    const occupiedPositions = this.placedUnits.map((u) => u.position)
    const emptySlots = this.gridManager.getEmptySlots(occupiedPositions)
    if (emptySlots.length === 0) return

    this.gold -= cost

    // 등급 결정 (확률 = 유물 + 성장 트리 행운)
    const roll = Math.random()
    const luckBonus = this.artifactBonuses.summonLuck + this.growthBonuses.luckBonus
    let grade: UnitGrade
    if (roll < (SUMMON_PROBABILITIES[3] ?? 0) + luckBonus) {
      grade = 3
    } else if (roll < (SUMMON_PROBABILITIES[3] ?? 0) + luckBonus + (SUMMON_PROBABILITIES[2] ?? 0)) {
      grade = 2
    } else {
      grade = 1
    }

    // 랜덤 유닛 선택
    const unitIdx = Math.floor(Math.random() * UNITS.length)
    const unitData = UNITS[unitIdx]
    if (!unitData) return

    // 랜덤 빈 슬롯 배치
    const slotIdx = Math.floor(Math.random() * emptySlots.length)
    const slot = emptySlots[slotIdx]
    if (!slot) return

    const instanceId = `unit-${++this.unitIdCounter}`
    const placedUnit: PlacedUnit = {
      instanceId,
      unitDataId: unitData.id,
      grade,
      position: slot.gridPos,
    }

    this.placedUnits.push(placedUnit)
    this.spawnUnitEntity(placedUnit)
  }

  private spawnUnitEntity(placedUnit: PlacedUnit) {
    const worldPos = this.gridManager.getSlotWorldPosition(placedUnit.position)
    if (!worldPos) return

    const slotSize = this.gridManager.getSlotSize()
    const entity = new UnitEntity(this, worldPos.x, worldPos.y, placedUnit, slotSize)
    this.units.set(placedUnit.instanceId, entity)
  }

  private showUnitRange(unit: UnitEntity) {
    const unitData = unit.placedUnit.fusionElement
      ? null
      : getUnitById(unit.placedUnit.unitDataId)
    const range = unitData?.range ?? 2.0
    const slotSize = this.gridManager.getSlotSize()
    unit.showRange(range, slotSize)
  }

  private setupDragAndDrop() {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof UnitEntity) {
        this.showUnitRange(gameObject)
      }
    })

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (gameObject instanceof UnitEntity) {
        gameObject.x = dragX
        gameObject.y = dragY
      }
    })

    this.input.on('drop', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropZone: Phaser.GameObjects.GameObject) => {
      if (!(gameObject instanceof UnitEntity)) return

      const draggedUnit = gameObject.placedUnit
      const targetPos = (dropZone as { gridPos?: { row: number; col: number } }).gridPos
      if (!targetPos) return

      // 대상 위치에 유닛이 있는지 확인
      const targetUnit = this.placedUnits.find(
        (u) => u.position.row === targetPos.row && u.position.col === targetPos.col,
      )

      if (targetUnit && targetUnit.instanceId !== draggedUnit.instanceId) {
        // 합치기 시도
        if (canMerge(draggedUnit, targetUnit)) {
          const result = executeMerge(draggedUnit, targetUnit, this.artifactBonuses.fusionChanceBonus)

          // 기존 유닛 제거
          this.removeUnit(draggedUnit.instanceId)
          this.removeUnit(targetUnit.instanceId)

          if (result.resultUnit) {
            result.resultUnit.position = targetPos
            this.placedUnits.push(result.resultUnit)
            this.spawnUnitEntity(result.resultUnit)

            if (result.type === 'fusion') {
              eventBus.emit('fusion-success', result.resultUnit.fusionElement)
            }

            // ★3 이상 도달 시 진화 가능 여부 확인
            if (canEvolve(result.resultUnit)) {
              const branches = getEvolutionBranches(result.resultUnit)
              if (branches) {
                this.isEvolutionPaused = true
                eventBus.emit('evolution-available', {
                  unitInstanceId: result.resultUnit.instanceId,
                  unitDataId: result.resultUnit.unitDataId,
                  branches,
                })
              }
            }
          }
          return
        }
      }

      // 빈 슬롯이면 이동
      if (!targetUnit) {
        const unitIdx = this.placedUnits.findIndex((u) => u.instanceId === draggedUnit.instanceId)
        if (unitIdx >= 0) {
          this.placedUnits[unitIdx] = { ...this.placedUnits[unitIdx]!, position: targetPos }
        }
        const worldPos = this.gridManager.getSlotWorldPosition(targetPos)
        if (worldPos) {
          gameObject.setPosition(worldPos.x, worldPos.y)
        }
        return
      }

      // 합치기 불가 → 원위치
      const originalPos = this.gridManager.getSlotWorldPosition(draggedUnit.position)
      if (originalPos) {
        gameObject.setPosition(originalPos.x, originalPos.y)
      }
    })

    // 드래그 취소 시 원위치
    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
      if (gameObject instanceof UnitEntity) {
        gameObject.hideRange()
        if (!dropped) {
          const pos = this.gridManager.getSlotWorldPosition(gameObject.placedUnit.position)
          if (pos) gameObject.setPosition(pos.x, pos.y)
        }
      }
    })
  }

  private removeUnit(instanceId: string) {
    const entity = this.units.get(instanceId)
    entity?.destroy()
    this.units.delete(instanceId)
    this.placedUnits = this.placedUnits.filter((u) => u.instanceId !== instanceId)
    this.attackCooldowns = this.attackCooldowns.filter((c) => c.instanceId !== instanceId)
    // 버프 소스 정리
    this.buffs = this.buffs.filter((b) => b.sourceId !== instanceId && b.targetId !== instanceId)
  }

  private handleStartWave = () => {
    if (this.isWaveActive) return
    this.currentWave++

    if (isGameClear(this.currentWave)) {
      this.handleGameClear()
      return
    }

    this.isWaveActive = true
    const spawnList = generateSpawnList(this.currentWave)

    // 스폰 타이머 (독립 경과 시간 추적)
    let spawnIndex = 0
    let totalElapsed = 0
    this.waveSpawnTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        totalElapsed += 100
        while (spawnIndex < spawnList.length) {
          const entry = spawnList[spawnIndex]
          if (!entry || entry.spawnDelay > totalElapsed) break

          const startPos = this.path[0]
          if (!startPos) { spawnIndex++; continue }

          const enemyInstanceId = `enemy-${++this.enemyIdCounter}`
          const EntityClass = entry.enemy.type === 'boss' ? BossEntity : EnemyEntity
          const enemy = new EntityClass(this, startPos.x, startPos.y, entry.enemy, entry.scaledHp, enemyInstanceId)
          this.enemies.push(enemy)

          // 보스 ability 루프 시작
          if (enemy instanceof BossEntity) {
            this.startBossAbilityLoop(enemy)
          }

          spawnIndex++
        }

        if (spawnIndex >= spawnList.length) {
          this.waveSpawnTimer?.destroy()
          this.waveSpawnTimer = undefined
        }
      },
    })
  }

  private handleWaveComplete() {
    this.isWaveActive = false

    // 골드 보상
    const waveGold = calculateWaveGold(
      this.currentWave,
      this.artifactBonuses.goldBonus,
      this.gold,
      this.artifactBonuses.interestRate,
    )
    this.gold += waveGold

    // HP 회복 (유물 보너스)
    if (this.artifactBonuses.hpRegen > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.artifactBonuses.hpRegen)
    }

    // 유물 선택 웨이브?
    if (isArtifactWave(this.currentWave)) {
      eventBus.emit('show-artifact-selection', this.ownedArtifacts)
    }

    eventBus.emit('wave-complete', this.currentWave)
  }

  private handleGrowthBonuses = (bonuses: { atkBonus: number; maxHpBonus: number; goldBonus: number; luckBonus: number }) => {
    this.growthBonuses = bonuses
    this.maxHp = 100 + bonuses.maxHpBonus
    this.hp = this.maxHp
  }

  private handleSelectArtifact = (artifactId: string) => {
    this.ownedArtifacts.push(artifactId)
    this.artifactBonuses = calculateArtifactBonuses(this.ownedArtifacts)

    // 최대 HP 보너스 적용 (유물 + 성장 트리)
    this.maxHp = 100 + this.artifactBonuses.maxHpBonus + this.growthBonuses.maxHpBonus
    this.hp = Math.min(this.hp, this.maxHp)
  }

  private handleGameOver() {
    this.isWaveActive = false
    this.waveSpawnTimer?.destroy()
    this.waveSpawnTimer = undefined
    eventBus.emit('game-over', {
      wave: this.currentWave,
      score: this.score,
      artifacts: this.ownedArtifacts,
    })
  }

  private handleGameClear() {
    eventBus.emit('game-clear', {
      wave: TOTAL_WAVES,
      score: this.score + 500, // 클리어 보너스
      artifacts: this.ownedArtifacts,
    })
  }

  private emitGameState() {
    eventBus.emit('game-state-update', {
      wave: this.currentWave,
      gold: this.gold,
      hp: this.hp,
      maxHp: this.maxHp,
      score: this.score,
      unitCount: this.placedUnits.length,
      isWaveActive: this.isWaveActive,
      heroState: this.heroSystem.getHeroState(),
    })
  }

  // 히어로 스킬 디버프 효과를 DebuffSystem에 적용
  private processHeroSkillEffects() {
    const effects = this.heroSystem.getSkillSystem().consumePendingEffects()
    for (const effect of effects) {
      this.debuffs.push({
        id: `hero-skill-${effect.type}-${effect.targetId}-${Date.now()}`,
        type: effect.type === 'stun' ? 'stun' : 'slow',
        targetId: effect.targetId,
        value: effect.value,
        remainingMs: effect.durationMs,
        maxMs: effect.durationMs,
      })
    }
  }

  private handleHeroUseSkill = (skillIndex: number) => {
    this.heroSystem.useSkill(skillIndex as 0 | 1, this.enemies)
  }

  private handleHeroSelectElement = (element: Element) => {
    this.heroSystem.destroy()
    this.heroSystem.init(this, element)
  }

  private handleEvolutionSelect = (...args: unknown[]) => {
    this.isEvolutionPaused = false
    const data = args[0] as { unitInstanceId: string; branchId: string }
    const unitIdx = this.placedUnits.findIndex((u) => u.instanceId === data.unitInstanceId)
    if (unitIdx < 0) return

    const unit = this.placedUnits[unitIdx]!
    const evolved = evolveUnit(unit, data.branchId)
    if (!evolved) return

    this.placedUnits[unitIdx] = evolved

    // 유닛 엔티티 갱신 (기존 제거 후 재생성)
    const entity = this.units.get(data.unitInstanceId)
    const worldPos = entity ? { x: entity.x, y: entity.y } : null
    entity?.destroy()
    this.units.delete(data.unitInstanceId)

    if (worldPos) {
      this.spawnUnitEntity(evolved)
    }

    eventBus.emit('evolution-complete', { unitInstanceId: data.unitInstanceId, branchId: data.branchId })
  }

  private handleEvolutionDismiss = () => {
    this.isEvolutionPaused = false
  }

  shutdown() {
    eventBus.off('growth-bonuses', this.handleGrowthBonuses as (...args: unknown[]) => void)
    eventBus.off('summon-unit', this.handleSummon)
    eventBus.off('start-wave', this.handleStartWave)
    eventBus.off('select-artifact', this.handleSelectArtifact as (...args: unknown[]) => void)
    eventBus.off('hero-use-skill', this.handleHeroUseSkill as (...args: unknown[]) => void)
    eventBus.off('hero-select-element', this.handleHeroSelectElement as (...args: unknown[]) => void)
    eventBus.off('evolution-select', this.handleEvolutionSelect)
    eventBus.off('evolution-dismiss', this.handleEvolutionDismiss)
    this.heroSystem.destroy()
    this.gridManager.destroy()
    this.units.clear()
    this.enemies.forEach((e) => e.destroy())
    this.projectiles.forEach((p) => p.destroy())
  }
}
