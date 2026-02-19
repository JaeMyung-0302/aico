import Phaser from 'phaser'
import type { PlacedUnit, UnitGrade, Element } from '@/types'
import { GridManager } from '@/game/systems/GridManager'
import { generateSPath, getPathGridPositions, drawPath } from '@/game/systems/PathSystem'
import { generateTerrainLayout, type TerrainTile } from '@/game/systems/TerrainSystem'
import { generateSpawnList, calculateWaveGold, isArtifactWave, isBossWave, isGameClear, TOTAL_WAVES } from '@/game/systems/WaveSystem'
import { calculateDamage, findTarget } from '@/game/systems/CombatSystem'
import { canMerge, executeMerge } from '@/game/systems/MergeSystem'
import { calculateArtifactBonuses, type ArtifactBonuses } from '@/game/systems/ArtifactSystem'
import { UNITS, SUMMON_COST, SUMMON_PROBABILITIES, getGradeMultiplier, getUnitById } from '@/game/data/units'
import { EnemyEntity } from '@/game/entities/Enemy'
import { BossEntity } from '@/game/entities/Boss'
import { UnitEntity } from '@/game/entities/Unit'
import { Projectile } from '@/game/entities/Projectile'
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

    // UI 이벤트 리스너
    eventBus.on('summon-unit', this.handleSummon)
    eventBus.on('start-wave', this.handleStartWave)
    eventBus.on('select-artifact', this.handleSelectArtifact as (...args: unknown[]) => void)

    // 초기 상태 전달
    this.emitGameState()

    // UIScene 동시 실행
    this.scene.launch('UIScene')
  }

  update(time: number, delta: number) {
    // 적 이동 + 도달 체크
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy || enemy.isDead) continue

      const reached = enemy.moveAlongPath(this.path, delta)
      if (reached) {
        const damage = enemy.enemyData.type === 'boss' ? 20 : 5
        this.hp = Math.max(0, this.hp - damage)
        enemy.playDeathAnimation(() => enemy.destroy())
        this.enemies.splice(i, 1)

        if (this.hp <= 0) {
          this.handleGameOver()
          return
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

      // 타겟 찾기
      const worldPos = this.gridManager.getSlotWorldPosition(placedUnit.position)
      if (!worldPos) continue

      const range = unitData?.range ?? 2.0
      const target = findTarget(worldPos.x, worldPos.y, range, slotSize, this.enemies)
      if (!target) continue

      // 데미지 계산
      const result = calculateDamage(
        placedUnit,
        target.enemyData.element,
        this.placedUnits,
        this.terrains,
        this.artifactBonuses,
      )

      // 투사체 발사
      const element = unitData?.element ?? 'fire'
      const proj = new Projectile(this, worldPos.x, worldPos.y, target.x, target.y, element)
      this.projectiles.push(proj)

      // 데미지 적용
      unitEntity.playAttackAnimation()
      const killed = target.takeDamage(result.damage)

      if (killed) {
        this.score += target.enemyData.type === 'boss' ? 100 : 10
        const reward = target.enemyData.reward
        const bonusGold = Math.round(reward * this.artifactBonuses.goldBonus)
        const eliteBonus = target.enemyData.type === 'elite'
          ? Math.round(reward * this.artifactBonuses.eliteBounty)
          : 0
        this.gold += reward + bonusGold + eliteBonus

        target.playDeathAnimation(() => {
          const idx = this.enemies.indexOf(target)
          if (idx >= 0) this.enemies.splice(idx, 1)
          target.destroy()
        })
      }

      cooldown.lastAttackTime = time
    }
  }

  private handleSummon = () => {
    const cost = Math.max(1, SUMMON_COST - this.artifactBonuses.summonDiscount)
    if (this.gold < cost) return

    // 빈 슬롯 찾기
    const occupiedPositions = this.placedUnits.map((u) => u.position)
    const emptySlots = this.gridManager.getEmptySlots(occupiedPositions)
    if (emptySlots.length === 0) return

    this.gold -= cost

    // 등급 결정 (확률)
    const roll = Math.random()
    const luckBonus = this.artifactBonuses.summonLuck
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

          const EntityClass = entry.enemy.type === 'boss' ? BossEntity : EnemyEntity
          const enemy = new EntityClass(this, startPos.x, startPos.y, entry.enemy, entry.scaledHp)
          this.enemies.push(enemy)
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

  private handleSelectArtifact = (artifactId: string) => {
    this.ownedArtifacts.push(artifactId)
    this.artifactBonuses = calculateArtifactBonuses(this.ownedArtifacts)

    // 최대 HP 보너스 적용
    this.maxHp = 100 + this.artifactBonuses.maxHpBonus
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
    })
  }

  shutdown() {
    eventBus.off('summon-unit', this.handleSummon)
    eventBus.off('start-wave', this.handleStartWave)
    eventBus.off('select-artifact', this.handleSelectArtifact as (...args: unknown[]) => void)
    this.gridManager.destroy()
    this.units.clear()
    this.enemies.forEach((e) => e.destroy())
    this.projectiles.forEach((p) => p.destroy())
  }
}
