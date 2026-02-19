import type { ActiveDebuff } from '@/types'
import { addDebuff } from './DebuffSystem'
import type { EnemyEntity } from '@/game/entities/Enemy'

// boss-inferno: 랜덤 유닛 위치에 화염 폭발, 반경 내 유닛 3초 공격 불가
export const executeInfernoAbility = (
  scene: Phaser.Scene,
  unitPositions: { instanceId: string; x: number; y: number }[],
  debuffs: ActiveDebuff[],
): ActiveDebuff[] => {
  if (unitPositions.length === 0) return debuffs

  // 랜덤 유닛 위치 선택
  const targetIdx = Math.floor(Math.random() * unitPositions.length)
  const target = unitPositions[targetIdx]
  if (!target) return debuffs

  // 화염 폭발 이펙트
  const circle = scene.add.circle(target.x, target.y, 30, 0xff4400, 0.4)
  circle.setStrokeStyle(2, 0xff8800, 0.8)
  scene.tweens.add({
    targets: circle,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 0,
    duration: 800,
    onComplete: () => circle.destroy(),
  })

  // 반경 내 유닛에 disable 디버프 (3초)
  let newDebuffs = debuffs
  for (const unit of unitPositions) {
    const dx = unit.x - target.x
    const dy = unit.y - target.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= 60) {
      newDebuffs = addDebuff(newDebuffs, 'disable', unit.instanceId, 1, 3000)
    }
  }

  return newDebuffs
}

// boss-leviathan: 가장 가까운 유닛에 50% 슬로우 5초 + 모든 적 속도 +30%
export const executeLeviathanAbility = (
  scene: Phaser.Scene,
  boss: EnemyEntity,
  unitPositions: { instanceId: string; x: number; y: number }[],
  enemies: EnemyEntity[],
  debuffs: ActiveDebuff[],
): ActiveDebuff[] => {
  // 물 분사 이펙트
  const wave = scene.add.circle(boss.x, boss.y, 20, 0x2288ff, 0.3)
  scene.tweens.add({
    targets: wave,
    scaleX: 3,
    scaleY: 3,
    alpha: 0,
    duration: 600,
    onComplete: () => wave.destroy(),
  })

  // 가장 가까운 유닛 찾기 → 슬로우
  let closestUnit: { instanceId: string; x: number; y: number } | undefined
  let closestDist = Infinity
  for (const unit of unitPositions) {
    const dx = unit.x - boss.x
    const dy = unit.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < closestDist) {
      closestDist = dist
      closestUnit = unit
    }
  }

  let newDebuffs = debuffs
  if (closestUnit) {
    // 유닛에 대한 "슬로우"는 의미가 약간 다르지만 disable로 표현 (공격 속도 감소)
    newDebuffs = addDebuff(newDebuffs, 'disable', closestUnit.instanceId, 1, 5000)
  }

  // 모든 적 속도 +30% (일시적, 5초)
  for (const enemy of enemies) {
    if (!enemy.isDead && enemy !== boss) {
      enemy.speed = enemy.enemyData.speed * 1.3
      // 5초 후 원복
      scene.time.delayedCall(5000, () => {
        if (!enemy.isDead) {
          enemy.speed = enemy.enemyData.speed
        }
      })
    }
  }

  return newDebuffs
}

// boss-titan: 전체 유닛 1초 스턴 + 자신 HP 1%/초 재생
export const executeTitanAbility = (
  scene: Phaser.Scene,
  boss: EnemyEntity,
  unitPositions: { instanceId: string; x: number; y: number }[],
  debuffs: ActiveDebuff[],
): ActiveDebuff[] => {
  // 지진 파동 이펙트
  const shockwave = scene.add.circle(boss.x, boss.y, 15, 0x886644, 0.5)
  scene.tweens.add({
    targets: shockwave,
    scaleX: 5,
    scaleY: 5,
    alpha: 0,
    duration: 500,
    onComplete: () => shockwave.destroy(),
  })

  // 전체 유닛 1초 스턴 (disable)
  let newDebuffs = debuffs
  for (const unit of unitPositions) {
    newDebuffs = addDebuff(newDebuffs, 'disable', unit.instanceId, 1, 1000)
  }

  // 자신 HP 재생 (최대HP의 1%)
  const regenAmount = boss.maxHp * 0.01
  boss.currentHp = Math.min(boss.maxHp, boss.currentHp + regenAmount)

  return newDebuffs
}
