import Phaser from 'phaser'
import type { MapId } from '@soulblade/shared'
import { PARALLAX_TEXTURES } from '../../texture-keys'

/**
 * 패럴랙스 배경 시스템
 * TileSprite.tilePositionX/Y를 카메라 scrollX/Y에 비율 곱해서 업데이트
 * far: factor 0.1 (느린 스크롤), near: factor 0.4 (중간 스크롤)
 */

interface ParallaxLayer {
  sprite: Phaser.GameObjects.TileSprite
  factor: number
}

const FAR_DEPTH = -3
const NEAR_DEPTH = -2
const FAR_FACTOR = 0.1
const NEAR_FACTOR = 0.4

export class ParallaxSystem {
  private scene: Phaser.Scene
  private layers: ParallaxLayer[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  onMapLoad = (mapId: MapId, _worldWidth: number, _worldHeight: number, maxLayers: number): void => {
    this.onMapUnload()

    if (maxLayers <= 0) return

    const texKeys = PARALLAX_TEXTURES[mapId]
    const cam = this.scene.cameras.main

    // far layer (항상 생성, maxLayers >= 1)
    // 뷰포트 크기 + setScrollFactor(0)으로 카메라 고정 (GPU 메모리 절약)
    const farSprite = this.scene.add.tileSprite(cam.width / 2, cam.height / 2, cam.width, cam.height, texKeys.far)
    farSprite.setScrollFactor(0)
    farSprite.setDepth(FAR_DEPTH)
    farSprite.setAlpha(0.6)
    this.layers.push({ sprite: farSprite, factor: FAR_FACTOR })

    // near layer (maxLayers >= 2)
    if (maxLayers >= 2) {
      const nearSprite = this.scene.add.tileSprite(cam.width / 2, cam.height / 2, cam.width, cam.height, texKeys.near)
      nearSprite.setScrollFactor(0)
      nearSprite.setDepth(NEAR_DEPTH)
      nearSprite.setAlpha(0.4)
      this.layers.push({ sprite: nearSprite, factor: NEAR_FACTOR })
    }
  }

  onMapUnload = (): void => {
    for (const layer of this.layers) {
      layer.sprite.destroy()
    }
    this.layers = []
  }

  update = (camera: Phaser.Cameras.Scene2D.Camera, enableParallax: boolean): void => {
    for (const layer of this.layers) {
      if (!enableParallax) {
        layer.sprite.setVisible(false)
        continue
      }
      layer.sprite.setVisible(true)
      layer.sprite.tilePositionX = camera.scrollX * layer.factor
      layer.sprite.tilePositionY = camera.scrollY * layer.factor
    }
  }

  destroy = (): void => {
    this.onMapUnload()
  }
}
