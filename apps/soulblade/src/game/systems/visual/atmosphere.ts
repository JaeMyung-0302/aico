import Phaser from 'phaser'
import type { MapId } from '@soulblade/shared'
import { VFX_TEXTURES } from '../../texture-keys'

/**
 * 환경 포그/비네팅 시스템
 * 사전 래스터화된 비네팅 텍스처를 Sprite로 표시
 * setScrollFactor(0)으로 카메라 고정, 맵별 setTint으로 색조 변경
 */

// 맵별 비네팅 틴트 색상 (맵 테마에 맞는 분위기 연출)
const MAP_ATMOSPHERE: Record<MapId, { tint: number; alpha: number }> = {
  town: { tint: 0xffcc88, alpha: 0.15 },
  serpent_forest: { tint: 0x33aa44, alpha: 0.25 },
  ice_cave: { tint: 0x4488cc, alpha: 0.25 },
  flame_castle: { tint: 0xff4422, alpha: 0.2 },
}

const ATMOSPHERE_DEPTH = 25

export class AtmosphereSystem {
  private scene: Phaser.Scene
  private vignetteSprite: Phaser.GameObjects.Sprite | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  onMapLoad = (mapId: MapId): void => {
    this.onMapUnload()

    const config = MAP_ATMOSPHERE[mapId]

    this.vignetteSprite = this.scene.add.sprite(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      VFX_TEXTURES.vignette,
    )
    this.vignetteSprite.setScrollFactor(0)
    this.vignetteSprite.setDepth(ATMOSPHERE_DEPTH)
    this.vignetteSprite.setTint(config.tint)
    this.vignetteSprite.setAlpha(config.alpha)
  }

  onMapUnload = (): void => {
    if (this.vignetteSprite) {
      this.vignetteSprite.destroy()
      this.vignetteSprite = null
    }
  }

  update = (enableAtmosphere: boolean): void => {
    if (!this.vignetteSprite) return
    this.vignetteSprite.setVisible(enableAtmosphere)
  }

  destroy = (): void => {
    this.onMapUnload()
  }
}
