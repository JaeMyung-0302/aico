import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    // 플레이스홀더 텍스처 생성
    this.createPlaceholderTextures()
  }

  create(): void {
    this.scene.start('GameScene')
  }

  private createPlaceholderTextures(): void {
    // 플레이어 (사람 형태 실루엣 - 파란색)
    const pg = this.make.graphics({ x: 0, y: 0 }, false)
    pg.fillStyle(0x4488ff, 1)
    pg.fillCircle(16, 6, 6) // 머리
    pg.fillRoundedRect(10, 12, 12, 10, 2) // 몸통
    pg.fillStyle(0x3377dd, 1)
    pg.fillRoundedRect(6, 13, 4, 8, 1) // 왼팔
    pg.fillRoundedRect(22, 13, 4, 8, 1) // 오른팔
    pg.fillRoundedRect(11, 22, 4, 9, 1) // 왼다리
    pg.fillRoundedRect(17, 22, 4, 9, 1) // 오른다리
    pg.generateTexture('player', 32, 32)
    pg.destroy()

    // 몬스터 (사람 형태 실루엣 - 빨간색)
    const mg = this.make.graphics({ x: 0, y: 0 }, false)
    mg.fillStyle(0xff4444, 1)
    mg.fillCircle(12, 5, 5) // 머리
    mg.fillRoundedRect(7, 10, 10, 8, 2) // 몸통
    mg.fillStyle(0xcc3333, 1)
    mg.fillRoundedRect(4, 11, 3, 6, 1) // 왼팔
    mg.fillRoundedRect(17, 11, 3, 6, 1) // 오른팔
    mg.fillRoundedRect(8, 18, 3, 5, 1) // 왼다리
    mg.fillRoundedRect(13, 18, 3, 5, 1) // 오른다리
    mg.generateTexture('monster', 24, 24)
    mg.destroy()

    // 투사체 (발광 원)
    const prg = this.make.graphics({ x: 0, y: 0 }, false)
    prg.fillStyle(0xffffff, 0.3)
    prg.fillCircle(4, 4, 6) // 외곽 글로우
    prg.fillStyle(0xffffff, 1)
    prg.fillCircle(4, 4, 3) // 코어
    prg.generateTexture('projectile', 8, 8)
    prg.destroy()
  }
}
