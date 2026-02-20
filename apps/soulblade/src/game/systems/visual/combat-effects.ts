import Phaser from 'phaser'
import type { CombatEffectLevel } from '../combat'

/**
 * 전투 이펙트 강화 시스템
 * 기존 juiciness.ts 보완 — 히트 스파크, 크리티컬 플래시, 처치 충격파
 * CombatEffectLevel: enhanced(full/reduced), basic(minimal), none(canvas)
 */

// 히트 시 스파크 파티클 (적에게 데미지 적중)
export class CombatEffectsSystem {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // 적 히트 시 스파크 이펙트
  onEntityHit = (x: number, y: number, isCrit: boolean, level: CombatEffectLevel): void => {
    if (level === 'none') return

    // basic: 작은 스파크만
    const sparkCount = level === 'enhanced' ? (isCrit ? 6 : 3) : 2
    const sparkColor = isCrit ? 0xffdd44 : 0xffffff

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 15 + Math.random() * 25
      const spark = this.scene.add.circle(x, y, isCrit ? 2 : 1.5, sparkColor, 0.9)
      spark.setDepth(15)

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 150 + Math.random() * 100,
        onComplete: () => spark.destroy(),
      })
    }

    // enhanced + 크리티컬: 확대 플래시 링
    if (level === 'enhanced' && isCrit) {
      const flash = this.scene.add.circle(x, y, 8, 0xffee66, 0.4)
      flash.setDepth(15)

      this.scene.tweens.add({
        targets: flash,
        scale: 3,
        alpha: 0,
        duration: 200,
        onComplete: () => flash.destroy(),
      })
    }
  }

  // 적 사망 시 강화 이펙트 (기존 spawnDeathParticles 보완)
  onEntityDeath = (x: number, y: number, entityType: 'normal' | 'elite', level: CombatEffectLevel): void => {
    if (level === 'none') return

    // basic: 간단한 바닥 마크만
    if (level === 'basic') {
      const mark = this.scene.add.circle(x, y, 6, 0x444444, 0.3)
      mark.setDepth(0)
      this.scene.tweens.add({
        targets: mark,
        alpha: 0,
        duration: 800,
        onComplete: () => mark.destroy(),
      })
      return
    }

    // enhanced: 충격파 링 + 잔류 글로우
    const ringColor = entityType === 'elite' ? 0xff6644 : 0xffaa44
    const ring = this.scene.add.circle(x, y, 5, ringColor, 0)
    ring.setDepth(15)
    ring.setStrokeStyle(2, ringColor, 0.6)

    this.scene.tweens.add({
      targets: ring,
      scale: entityType === 'elite' ? 4 : 2.5,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy(),
    })

    // 잔류 바닥 글로우
    const glow = this.scene.add.circle(x, y, entityType === 'elite' ? 10 : 6, ringColor, 0.15)
    glow.setDepth(0)

    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      duration: 1000,
      delay: 200,
      onComplete: () => glow.destroy(),
    })
  }

  destroy = (): void => {
    // 트윈 기반이므로 별도 정리 불필요 (씬 shutdown 시 자동 정리)
  }
}
