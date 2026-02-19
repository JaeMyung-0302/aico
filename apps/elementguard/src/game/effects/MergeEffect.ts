import Phaser from 'phaser'
import type { UnitGrade } from '@/types'

// 등급별 합치기 이펙트
const GRADE_EFFECTS: Record<UnitGrade, { particles: number; scale: number; color: number; duration: number }> = {
  1: { particles: 4, scale: 0.4, color: 0xaaaaaa, duration: 300 },
  2: { particles: 6, scale: 0.5, color: 0x44ff44, duration: 400 },
  3: { particles: 8, scale: 0.6, color: 0x4488ff, duration: 500 },
  4: { particles: 12, scale: 0.8, color: 0xaa44ff, duration: 600 },
  5: { particles: 16, scale: 1.0, color: 0xff8800, duration: 800 },
}

export const playMergeEffect = (scene: Phaser.Scene, x: number, y: number, grade: UnitGrade) => {
  const config = GRADE_EFFECTS[grade]

  // 링 이펙트
  const ring = scene.add.circle(x, y, 5, config.color, 0.6)
  ring.setDepth(100)

  scene.tweens.add({
    targets: ring,
    radius: 30 * config.scale,
    alpha: 0,
    duration: config.duration,
    ease: 'Power2',
    onComplete: () => ring.destroy(),
  })

  // 파티클 (작은 원)
  for (let i = 0; i < config.particles; i++) {
    const angle = (Math.PI * 2 * i) / config.particles
    const particle = scene.add.circle(x, y, 2 + grade, config.color, 0.8)
    particle.setDepth(101)

    const distance = 20 + grade * 8
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: 0.3,
      duration: config.duration * 0.8,
      ease: 'Power2',
      delay: Math.random() * 50,
      onComplete: () => particle.destroy(),
    })
  }

  // ★5 전설급: 추가 광선 폭발
  if (grade >= 5) {
    const flash = scene.add.rectangle(x, y, 200, 200, 0xffffff, 0.3)
    flash.setDepth(99)
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    })
  }
}
