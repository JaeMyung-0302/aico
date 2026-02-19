import Phaser from 'phaser'
import type { Element, FusionElement, TerrainType } from '@/types'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'

// 에셋 로딩 씬 (플레이스홀더 에셋)
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // 플레이스홀더: 프로그래매틱 텍스처 생성 (스프라이트 대체)
    this.createPlaceholderTextures()

    // 로딩 바 표시
    const { width, height } = this.scale
    const barWidth = width * 0.6
    const barHeight = 20
    const barX = (width - barWidth) / 2
    const barY = height / 2

    const bg = this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x333333)
    const bar = this.add.rectangle(barX, barY, 0, barHeight, 0x44ff88)
    bar.setOrigin(0, 0.5)

    this.load.on('progress', (value: number) => {
      bar.width = barWidth * value
    })

    this.load.on('complete', () => {
      bg.destroy()
      bar.destroy()
    })
  }

  create() {
    this.scene.start('GameScene')
  }

  private createPlaceholderTextures() {
    this.createUnitTextures()
    this.createFusionTextures()
    this.createEnemyTextures()
    this.createBossTextures()
    this.createProjectileTexture()
    this.createGridTextures()
    this.createTerrainTextures()
  }

  private createUnitTextures() {
    // Fire: 불꽃 형태
    const fire = this.add.graphics()
    fire.fillStyle(0xff4444, 1)
    fire.beginPath()
    fire.moveTo(16, 2)
    fire.lineTo(22, 12)
    fire.lineTo(28, 18)
    fire.lineTo(24, 26)
    fire.lineTo(20, 30)
    fire.lineTo(16, 26)
    fire.lineTo(12, 30)
    fire.lineTo(8, 26)
    fire.lineTo(4, 18)
    fire.lineTo(10, 12)
    fire.closePath()
    fire.fillPath()
    fire.fillStyle(0xff8844, 0.8)
    fire.fillCircle(16, 18, 5)
    fire.generateTexture(TEXTURE_KEYS.unit('fire'), 32, 32)
    fire.destroy()

    // Water: 물방울 형태
    const water = this.add.graphics()
    water.fillStyle(0x4488ff, 1)
    water.beginPath()
    water.moveTo(16, 3)
    water.lineTo(26, 18)
    water.arc(16, 20, 10, 0, Math.PI, false)
    water.closePath()
    water.fillPath()
    water.fillStyle(0x88bbff, 0.6)
    water.fillCircle(13, 18, 3)
    water.generateTexture(TEXTURE_KEYS.unit('water'), 32, 32)
    water.destroy()

    // Wind: 소용돌이 형태
    const wind = this.add.graphics()
    wind.fillStyle(0x44ff88, 0.3)
    wind.fillCircle(16, 16, 14)
    wind.lineStyle(3, 0x44ff88, 1)
    wind.beginPath()
    wind.arc(16, 16, 10, 0, Math.PI * 1.5, false)
    wind.strokePath()
    wind.lineStyle(2, 0x88ffbb, 1)
    wind.beginPath()
    wind.arc(16, 16, 6, Math.PI * 0.5, Math.PI * 2, false)
    wind.strokePath()
    wind.fillStyle(0xaaffcc, 1)
    wind.fillCircle(16, 16, 3)
    wind.generateTexture(TEXTURE_KEYS.unit('wind'), 32, 32)
    wind.destroy()

    // Thunder: 번개 형태
    const thunder = this.add.graphics()
    thunder.fillStyle(0xffff44, 1)
    thunder.beginPath()
    thunder.moveTo(18, 2)
    thunder.lineTo(24, 2)
    thunder.lineTo(15, 14)
    thunder.lineTo(22, 14)
    thunder.lineTo(10, 30)
    thunder.lineTo(14, 17)
    thunder.lineTo(8, 17)
    thunder.closePath()
    thunder.fillPath()
    thunder.fillStyle(0xffffaa, 0.5)
    thunder.fillCircle(16, 16, 6)
    thunder.generateTexture(TEXTURE_KEYS.unit('thunder'), 32, 32)
    thunder.destroy()

    // Earth: 결정/바위 형태 (육각형)
    const earth = this.add.graphics()
    earth.fillStyle(0x886644, 1)
    earth.beginPath()
    earth.moveTo(16, 3)
    earth.lineTo(27, 9)
    earth.lineTo(27, 23)
    earth.lineTo(16, 29)
    earth.lineTo(5, 23)
    earth.lineTo(5, 9)
    earth.closePath()
    earth.fillPath()
    earth.lineStyle(2, 0xaa8866, 1)
    earth.beginPath()
    earth.moveTo(16, 3)
    earth.lineTo(16, 29)
    earth.moveTo(5, 9)
    earth.lineTo(27, 23)
    earth.moveTo(27, 9)
    earth.lineTo(5, 23)
    earth.strokePath()
    earth.generateTexture(TEXTURE_KEYS.unit('earth'), 32, 32)
    earth.destroy()
  }

  private createFusionTextures() {
    const fusionDesigns: Record<FusionElement, { color: number; accent: number }> = {
      plasma: { color: 0xff88ff, accent: 0xffaaff },
      frost: { color: 0x88ddff, accent: 0xbbeeff },
      lava: { color: 0xff6600, accent: 0xff9944 },
      storm: { color: 0x88ffaa, accent: 0xbbffcc },
      swamp: { color: 0x448844, accent: 0x66aa66 },
      heatwave: { color: 0xff8844, accent: 0xffaa77 },
    }

    for (const [fusion, { color, accent }] of Object.entries(fusionDesigns)) {
      const g = this.add.graphics()
      // 다이아몬드 외형
      g.fillStyle(color, 1)
      g.beginPath()
      g.moveTo(16, 2)
      g.lineTo(30, 16)
      g.lineTo(16, 30)
      g.lineTo(2, 16)
      g.closePath()
      g.fillPath()
      // 내부 빛 효과
      g.fillStyle(accent, 0.6)
      g.beginPath()
      g.moveTo(16, 8)
      g.lineTo(24, 16)
      g.lineTo(16, 24)
      g.lineTo(8, 16)
      g.closePath()
      g.fillPath()
      // 중앙 코어
      g.fillStyle(0xffffff, 0.8)
      g.fillCircle(16, 16, 3)
      // 외곽선
      g.lineStyle(2, 0xffffff, 0.6)
      g.beginPath()
      g.moveTo(16, 2)
      g.lineTo(30, 16)
      g.lineTo(16, 30)
      g.lineTo(2, 16)
      g.closePath()
      g.strokePath()
      g.generateTexture(TEXTURE_KEYS.fusion(fusion as FusionElement), 32, 32)
      g.destroy()
    }
  }

  private createEnemyTextures() {
    const elementColors: Record<Element, number> = {
      fire: 0xff4444, water: 0x4488ff, wind: 0x44ff88,
      thunder: 0xffff44, earth: 0x886644,
    }

    for (const [element, color] of Object.entries(elementColors)) {
      const g = this.add.graphics()
      // 몬스터 얼굴 (역삼각형 + 눈)
      g.fillStyle(color, 0.9)
      g.fillTriangle(16, 28, 2, 4, 30, 4)
      g.lineStyle(1, 0x000000, 0.4)
      g.strokeTriangle(16, 28, 2, 4, 30, 4)
      // 눈
      g.fillStyle(0xffffff, 1)
      g.fillCircle(11, 12, 4)
      g.fillCircle(21, 12, 4)
      g.fillStyle(0x220000, 1)
      g.fillCircle(12, 12, 2)
      g.fillCircle(22, 12, 2)
      g.generateTexture(TEXTURE_KEYS.enemy(element as Element), 32, 32)
      g.destroy()
    }
  }

  private createBossTextures() {
    const elementColors: Record<Element, number> = {
      fire: 0xff4444, water: 0x4488ff, wind: 0x44ff88,
      thunder: 0xffff44, earth: 0x886644,
    }

    for (const [element, color] of Object.entries(elementColors)) {
      const g = this.add.graphics()
      // 대형 몬스터 (역삼각형 + 뿔 + 눈)
      g.fillStyle(color, 1)
      g.fillTriangle(24, 44, 2, 8, 46, 8)
      // 뿔
      g.fillStyle(0x333333, 1)
      g.fillTriangle(10, 8, 6, 0, 14, 4)
      g.fillTriangle(38, 8, 34, 4, 42, 0)
      // 외곽선
      g.lineStyle(2, 0xff0000, 1)
      g.strokeTriangle(24, 44, 2, 8, 46, 8)
      // 눈 (붉은 발광)
      g.fillStyle(0xff0000, 1)
      g.fillCircle(16, 18, 5)
      g.fillCircle(32, 18, 5)
      g.fillStyle(0xffff00, 1)
      g.fillCircle(17, 18, 2)
      g.fillCircle(33, 18, 2)
      g.generateTexture(TEXTURE_KEYS.boss(element as Element), 48, 48)
      g.destroy()
    }
  }

  private createProjectileTexture() {
    // 범용 투사체
    const g = this.add.graphics()
    g.fillStyle(0xffffff, 0.6)
    g.fillCircle(4, 4, 4)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(4, 4, 2)
    g.generateTexture(TEXTURE_KEYS.projectileSingle, 8, 8)
    g.destroy()

    // 속성별 투사체
    const elementColors: Record<Element, number> = {
      fire: 0xff4444, water: 0x4488ff, wind: 0x44ff88,
      thunder: 0xffff44, earth: 0x886644,
    }

    for (const [element, color] of Object.entries(elementColors)) {
      const pg = this.add.graphics()
      pg.fillStyle(color, 0.5)
      pg.fillCircle(6, 6, 6)
      pg.fillStyle(color, 1)
      pg.fillCircle(6, 6, 3)
      pg.fillStyle(0xffffff, 0.8)
      pg.fillCircle(5, 5, 1)
      pg.generateTexture(TEXTURE_KEYS.projectile(element as Element), 12, 12)
      pg.destroy()
    }
  }

  private createGridTextures() {
    // 경로 타일 (돌길 느낌)
    const path = this.add.graphics()
    path.fillStyle(0x3a2f25, 0.8)
    path.fillRect(0, 0, 64, 64)
    path.fillStyle(0x4a3f35, 0.6)
    path.fillRoundedRect(3, 3, 26, 26, 3)
    path.fillRoundedRect(35, 3, 26, 26, 3)
    path.fillRoundedRect(3, 35, 26, 26, 3)
    path.fillRoundedRect(35, 35, 26, 26, 3)
    path.lineStyle(1, 0x2a1f15, 0.5)
    path.strokeRect(0, 0, 64, 64)
    path.generateTexture(TEXTURE_KEYS.pathTile, 64, 64)
    path.destroy()

    // 배치 슬롯 (잔디 느낌)
    const slot = this.add.graphics()
    slot.fillStyle(0x2a4a2a, 0.4)
    slot.fillRect(0, 0, 64, 64)
    slot.lineStyle(1, 0x44aa44, 0.3)
    slot.strokeRect(1, 1, 62, 62)
    slot.fillStyle(0x3a5a3a, 0.2)
    slot.fillCircle(16, 16, 2)
    slot.fillCircle(48, 24, 2)
    slot.fillCircle(32, 48, 2)
    slot.fillCircle(12, 44, 1)
    slot.fillCircle(52, 52, 1)
    slot.generateTexture(TEXTURE_KEYS.gridSlot, 64, 64)
    slot.destroy()
  }

  private createTerrainTextures() {
    const terrainDesigns: Record<TerrainType, { bg: number; detail: number }> = {
      lava: { bg: 0xff4444, detail: 0xff8844 },
      pool: { bg: 0x4488ff, detail: 0x88bbff },
      conductor: { bg: 0xffff44, detail: 0xffffaa },
      rock: { bg: 0x886644, detail: 0xaa8866 },
      gust: { bg: 0x44ff88, detail: 0x88ffbb },
    }

    for (const [terrain, { bg, detail }] of Object.entries(terrainDesigns)) {
      const g = this.add.graphics()
      g.fillStyle(bg, 0.3)
      g.fillRect(0, 0, 64, 64)
      // 지형 패턴
      g.fillStyle(detail, 0.2)
      g.fillCircle(20, 20, 12)
      g.fillCircle(44, 44, 12)
      g.fillCircle(44, 20, 8)
      g.fillCircle(20, 44, 8)
      g.lineStyle(1, bg, 0.4)
      g.strokeRect(2, 2, 60, 60)
      g.generateTexture(TEXTURE_KEYS.terrain(terrain as TerrainType), 64, 64)
      g.destroy()
    }
  }
}
