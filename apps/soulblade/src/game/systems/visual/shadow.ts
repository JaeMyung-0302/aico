import Phaser from 'phaser'

/**
 * 드롭 섀도우 시스템
 * Ellipse GameObject 사용 (GPU batch 가능, 매 프레임 Graphics redraw 불필요)
 * 엔티티 하단에 타원형 반투명 그림자 렌더링 → 입체감 표현
 */

type ShadowSize = 'small' | 'medium' | 'large'

const SHADOW_SIZES: Record<ShadowSize, { width: number; height: number }> = {
  small: { width: 20, height: 8 },
  medium: { width: 28, height: 10 },
  large: { width: 40, height: 14 },
}

const SHADOW_DEPTH = 0
const SHADOW_ALPHA = 0.3
const SHADOW_COLOR = 0x000000

export class ShadowSystem {
  private scene: Phaser.Scene
  private shadowMap = new Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Ellipse>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  attach = (entity: Phaser.Physics.Arcade.Sprite, size: ShadowSize): void => {
    if (this.shadowMap.has(entity)) return

    const cfg = SHADOW_SIZES[size]
    const shadow = this.scene.add.ellipse(
      entity.x,
      entity.y + entity.height * 0.45,
      cfg.width,
      cfg.height,
      SHADOW_COLOR,
      SHADOW_ALPHA,
    )
    shadow.setDepth(SHADOW_DEPTH)
    this.shadowMap.set(entity, shadow)
  }

  detach = (entity: Phaser.Physics.Arcade.Sprite): void => {
    const shadow = this.shadowMap.get(entity)
    if (shadow) {
      shadow.destroy()
      this.shadowMap.delete(entity)
    }
  }

  // 매 프레임 호출: 엔티티 위치에 섀도우 동기화 + 비활성 엔티티 자동 숨김
  update = (enableShadows: boolean): void => {
    for (const [sprite, shadow] of this.shadowMap) {
      if (!enableShadows || !sprite.active) {
        shadow.setVisible(false)
        continue
      }
      shadow.setPosition(sprite.x, sprite.y + sprite.height * 0.45)
      shadow.setVisible(true)
    }
  }

  destroy = (): void => {
    for (const shadow of this.shadowMap.values()) {
      shadow.destroy()
    }
    this.shadowMap.clear()
  }
}
