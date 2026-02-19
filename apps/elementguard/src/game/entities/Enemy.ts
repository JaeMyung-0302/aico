import Phaser from 'phaser'
import type { EnemyData, ElementMark, Element } from '@/types'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'
import { getShieldHits } from '@/game/data/traits'
import { ELEMENT_COLORS } from '@/game/systems/ElementSystem'

export class EnemyEntity extends Phaser.GameObjects.Container {
  readonly instanceId: string
  readonly enemyData: EnemyData
  currentHp: number
  maxHp: number
  speed: number
  shieldHits: number // shielded 특성: 남은 방어 횟수
  elementMarks: ElementMark[] = [] // 원소 마킹
  private sprite: Phaser.GameObjects.Image
  private hpBarBg: Phaser.GameObjects.Rectangle
  private hpBarFill: Phaser.GameObjects.Rectangle
  private pathIndex = 0
  private isSlowed = false
  private markDots: Phaser.GameObjects.Arc[] = []
  private lastMarkKey = ''
  isDead = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyData: EnemyData,
    scaledHp: number,
    instanceId: string,
  ) {
    super(scene, x, y)
    this.instanceId = instanceId
    this.enemyData = enemyData
    this.maxHp = scaledHp
    this.currentHp = scaledHp
    this.speed = enemyData.speed
    this.shieldHits = getShieldHits(enemyData.traits)

    // 스프라이트
    const textureKey = enemyData.type === 'boss'
      ? TEXTURE_KEYS.boss(enemyData.element)
      : TEXTURE_KEYS.enemy(enemyData.element)

    const size = enemyData.type === 'boss' ? 40 : 24
    this.sprite = scene.add.image(0, 0, textureKey)
    this.sprite.setDisplaySize(size, size)
    this.add(this.sprite)

    // HP 바
    const barWidth = size + 8
    const barHeight = 4
    const barY = -size / 2 - 6

    this.hpBarBg = scene.add.rectangle(0, barY, barWidth, barHeight, 0x333333)
    this.add(this.hpBarBg)

    this.hpBarFill = scene.add.rectangle(0, barY, barWidth, barHeight, 0x44ff44)
    this.add(this.hpBarFill)

    // 면역 방패 아이콘
    if (enemyData.immuneElement) {
      const shieldIcon = scene.add.circle(size / 2 + 6, -size / 2 - 4, 5, 0x4488ff, 0.9)
      shieldIcon.setStrokeStyle(1, 0xffffff, 0.8)
      this.add(shieldIcon)
    }

    // 특성 아이콘 표시
    if (enemyData.traits && enemyData.traits.length > 0) {
      const traitColors: Record<string, number> = {
        armored: 0x888888,
        fast: 0xffff44,
        regen: 0x44ff44,
        swarm: 0xaa8844,
        shielded: 0x8844ff,
      }
      enemyData.traits.forEach((trait, idx) => {
        const color = traitColors[trait] ?? 0xffffff
        const traitDot = scene.add.circle(
          -size / 2 - 4 + idx * 8,
          -size / 2 - 4,
          3,
          color,
          0.9,
        )
        traitDot.setStrokeStyle(1, 0x000000, 0.6)
        this.add(traitDot)
      })
    }

    scene.add.existing(this)
  }

  takeDamage(amount: number): boolean {
    this.currentHp = Math.max(0, this.currentHp - amount)
    this.updateHpBar()

    // 피격 이펙트: 흰색 플래시 + 흔들림
    this.sprite.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this,
      x: this.x + 2,
      duration: 30,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.sprite.clearTint(),
    })

    if (this.currentHp <= 0) {
      this.isDead = true
      return true
    }
    return false
  }

  private updateHpBar() {
    const ratio = this.currentHp / this.maxHp
    const fullWidth = this.hpBarBg.width
    this.hpBarFill.width = fullWidth * ratio
    this.hpBarFill.x = -(fullWidth * (1 - ratio)) / 2

    // 색상 변경 (초록 → 노랑 → 빨강)
    if (ratio > 0.5) {
      this.hpBarFill.setFillStyle(0x44ff44)
    } else if (ratio > 0.25) {
      this.hpBarFill.setFillStyle(0xffff44)
    } else {
      this.hpBarFill.setFillStyle(0xff4444)
    }
  }

  // 경로를 따라 이동 (effectiveSpeed 적용)
  moveAlongPath(path: Phaser.Math.Vector2[], delta: number, effectiveSpeed?: number): boolean {
    if (this.pathIndex >= path.length) return true // 끝 도달

    const target = path[this.pathIndex]
    if (!target) return true

    const speed = effectiveSpeed ?? this.speed
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = (speed * delta) / 1000

    if (dist <= step) {
      this.setPosition(target.x, target.y)
      this.pathIndex++
      return this.pathIndex >= path.length
    }

    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    return false
  }

  // 디버프 시각 효과 업데이트 (슬로우=파란 틴트)
  updateDebuffVisual(slowed: boolean) {
    if (slowed && !this.isSlowed) {
      this.sprite.setTint(0x4488ff)
      this.isSlowed = true
    } else if (!slowed && this.isSlowed) {
      this.sprite.clearTint()
      this.isSlowed = false
    }
  }

  // 원소 마킹 적용 (같은 원소는 갱신)
  applyMark(element: Element, currentTime: number): void {
    this.elementMarks = [
      ...this.elementMarks.filter(m => m.element !== element),
      { element, appliedAt: currentTime },
    ]
  }

  // 유효 시간 내 활성 마킹 반환
  getActiveMarks(currentTime: number, windowMs = 2000): ElementMark[] {
    return this.elementMarks.filter(m => currentTime - m.appliedAt <= windowMs)
  }

  // 마킹 초기화 (반응 발동 후 또는 사망 시)
  clearMarks(): void {
    this.elementMarks = []
    this.lastMarkKey = ''
    for (const dot of this.markDots) dot.destroy()
    this.markDots = []
  }

  // 마킹 시각 표시 업데이트 (원소 색상 dot)
  updateMarkVisuals(currentTime: number): void {
    const activeMarks = this.getActiveMarks(currentTime)
    const markKey = activeMarks.map(m => m.element).join(',')
    if (markKey === this.lastMarkKey) return
    this.lastMarkKey = markKey

    for (const dot of this.markDots) dot.destroy()
    this.markDots = []

    const size = this.enemyData.type === 'boss' ? 40 : 24
    activeMarks.forEach((mark, idx) => {
      const color = ELEMENT_COLORS[mark.element]
      const dot = this.scene.add.circle(
        -6 + idx * 8,
        size / 2 + 4,
        3,
        color,
        0.9,
      )
      dot.setStrokeStyle(1, 0xffffff, 0.6)
      this.add(dot)
      this.markDots.push(dot)
    })
  }

  // 쉴드 피격 처리 (shielded 특성)
  absorbShieldHit(): boolean {
    if (this.shieldHits <= 0) return false
    this.shieldHits--
    return true // 데미지 흡수됨
  }

  playDeathAnimation(onComplete?: () => void) {
    // 파티클 분해 효과
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 4,
        this.y + Math.sin(angle) * 4,
        3, 0xffffff, 0.8,
      )
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 20,
        y: this.y + Math.sin(angle) * 20,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300,
        onComplete: () => particle.destroy(),
      })
    }

    // 본체 축소 + 페이드
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 250,
      onComplete: () => onComplete?.(),
    })
  }
}
