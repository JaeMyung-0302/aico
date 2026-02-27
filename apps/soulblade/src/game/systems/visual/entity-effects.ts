import Phaser from 'phaser'
import type { Player } from '../../entities/Player'

/**
 * 엔티티 시각 강화 시스템
 * - 엘리트 글로우 오라: mutation tint 색상 Ellipse (depth 9)
 * - 플레이어 호흡 트윈: 미세한 scale 진동 (0.98~1.02)
 */

const GLOW_DEPTH = 9
const GLOW_ALPHA = 0.2
const GLOW_RADIUS_X = 18
const GLOW_RADIUS_Y = 10

const BREATH_MIN = 0.98
const BREATH_MAX = 1.02
const BREATH_DURATION = 1200

export class EntityEffectsSystem {
  private scene: Phaser.Scene
  private glowMap = new Map<
    Phaser.Physics.Arcade.Sprite,
    Phaser.GameObjects.Ellipse
  >()
  private breathTween: Phaser.Tweens.Tween | null = null
  private breathTarget: Player | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // 엘리트 글로우 오라 부착
  attachGlow = (entity: Phaser.Physics.Arcade.Sprite, color: number): void => {
    if (this.glowMap.has(entity)) return

    const glow = this.scene.add.ellipse(
      entity.x,
      entity.y,
      GLOW_RADIUS_X * 2,
      GLOW_RADIUS_Y * 2,
      color,
      GLOW_ALPHA,
    )
    glow.setDepth(GLOW_DEPTH)
    this.glowMap.set(entity, glow)
  }

  // 글로우 제거
  detachGlow = (entity: Phaser.Physics.Arcade.Sprite): void => {
    const glow = this.glowMap.get(entity)
    if (glow) {
      glow.destroy()
      this.glowMap.delete(entity)
    }
  }

  // 플레이어 호흡 트윈 시작
  startBreathTween = (player: Player): void => {
    if (this.breathTween) return
    this.breathTarget = player

    this.breathTween = this.scene.tweens.add({
      targets: player,
      scaleX: { from: BREATH_MIN, to: BREATH_MAX },
      scaleY: { from: BREATH_MAX, to: BREATH_MIN },
      duration: BREATH_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  // 호흡 트윈 정지
  private stopBreathTween = (): void => {
    if (this.breathTween) {
      this.breathTween.destroy()
      this.breathTween = null
    }
    if (this.breathTarget) {
      this.breathTarget.setScale(1)
      this.breathTarget = null
    }
  }

  // 매 프레임 업데이트
  update = (
    enableEntityGlow: boolean,
    enableBreathTween: boolean,
    elites: Phaser.Physics.Arcade.Group,
  ): void => {
    // 글로우 업데이트: 위치 동기화 + 비활성 엔티티 숨기기
    for (const [entity, glow] of this.glowMap) {
      if (!enableEntityGlow || !entity.active) {
        glow.setVisible(false)
        continue
      }
      glow.setVisible(true)
      glow.setPosition(entity.x, entity.y + entity.height * 0.35)
    }

    // 엘리트에 글로우 자동 부착 + 재활용 시 tint 갱신
    if (enableEntityGlow) {
      for (const child of elites.getChildren()) {
        const elite = child as Phaser.Physics.Arcade.Sprite
        if (!elite.active) continue
        const tint = elite.tintTopLeft ?? 0xffffff
        const existing = this.glowMap.get(elite)
        if (!existing) {
          this.attachGlow(elite, tint)
        } else if (existing.fillColor !== tint) {
          existing.setFillStyle(tint, GLOW_ALPHA)
        }
      }
    }

    // 호흡 트윈 관리 (LOD + 플레이어 활성 상태)
    const targetIsAlive = this.breathTarget?.active ?? false
    if (enableBreathTween && targetIsAlive && !this.breathTween) {
      this.startBreathTween(this.breathTarget!)
    } else if (this.breathTween && (!enableBreathTween || !targetIsAlive)) {
      this.stopBreathTween()
    }
  }

  // 맵 전환 시 글로우 전체 해제
  clearGlows = (): void => {
    for (const [, glow] of this.glowMap) {
      glow.destroy()
    }
    this.glowMap.clear()
  }

  destroy = (): void => {
    this.stopBreathTween()
    this.clearGlows()
  }
}
