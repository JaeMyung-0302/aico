import Phaser from 'phaser'
import { PLAYER_SPRITESHEET_KEYS, PLAYER_ANIM_KEYS, MONSTER_TEXTURES, PROJECTILE_TEXTURE, BG_TEXTURES } from '../texture-keys'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    this.createPlayerTextures()
    this.createMonsterTextures()
    this.createProjectileTexture()
    this.createBackgroundTextures()
  }

  create(): void {
    this.registerPlayerAnimations()
    this.scene.start('GameScene')
  }

  // --- 플레이어 클래스별 텍스처 (32x48) ---

  private createPlayerTextures(): void {
    this.createWarriorSpritesheet()
    this.createMageSpritesheet()
    this.createPaladinSpritesheet()
    this.createArcherSpritesheet()
  }

  // --- spritesheet 프레임 등록 헬퍼 ---
  private registerSpritesheet(key: string, frameWidth: number, frameHeight: number, frameCount: number): void {
    const tex = this.textures.get(key)
    for (let i = 0; i < frameCount; i++) {
      tex.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight)
    }
  }

  // Warrior: 넓은 어깨, 검+방패, 중갑 (5프레임: idle, attack×2, walk×2)
  private createWarriorSpritesheet(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    const W = 32

    const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
      g.fillStyle(0x666666, 1); g.fillCircle(ox + 16, 8, 7)
      g.fillStyle(0x888888, 1); g.fillRect(ox + 10, 2, 12, 3)
      g.fillStyle(0x222222, 1); g.fillRect(ox + 12, 7, 8, 2)
      g.fillStyle(0x556677, 1); g.fillRoundedRect(ox + 8, 15, 16, 14, 2)
      g.fillStyle(0x667788, 1); g.fillRect(ox + 12, 16, 8, 12)
      g.fillStyle(0x778899, 1)
      g.fillRoundedRect(ox + 4, 14, 8, 6, 2); g.fillRoundedRect(ox + 20, 14, 8, 6, 2)
      g.fillStyle(0x445566, 1)
      g.fillRoundedRect(ox + 3, 20, 6, 10, 1)
      g.fillStyle(0x8899aa, 1); g.fillRect(ox + 4, 21, 4, 8)
      const lS = walkPhase === 1 ? -3 : walkPhase === 2 ? 3 : 0
      const rS = walkPhase === 1 ? 3 : walkPhase === 2 ? -3 : 0
      g.fillStyle(0x445566, 1)
      g.fillRoundedRect(ox + 10, 29 + lS, 5, 12, 1); g.fillRoundedRect(ox + 17, 29 + rS, 5, 12, 1)
      g.fillStyle(0x554433, 1)
      g.fillRoundedRect(ox + 9, 38 + lS, 7, 5, 1); g.fillRoundedRect(ox + 16, 38 + rS, 7, 5, 1)
    }

    // Frame 0: idle — 검 수직
    drawBody(0)
    g.fillStyle(0x445566, 1); g.fillRoundedRect(23, 20, 5, 8, 1)
    g.fillStyle(0xccccdd, 1); g.fillRect(25, 12, 2, 14)
    g.fillStyle(0x886633, 1); g.fillRect(23, 25, 6, 2)

    // Frame 1: 검 들어올림
    drawBody(W)
    g.fillStyle(0x445566, 1); g.fillRoundedRect(W + 22, 14, 5, 8, 1)
    g.fillStyle(0xccccdd, 1); g.fillRect(W + 24, 4, 2, 14)
    g.fillStyle(0x886633, 1); g.fillRect(W + 22, 17, 6, 2)

    // Frame 2: 검 수평 휘두르기
    drawBody(W * 2)
    g.fillStyle(0x445566, 1); g.fillRoundedRect(W * 2 + 22, 20, 8, 5, 1)
    g.fillStyle(0xccccdd, 1); g.fillRect(W * 2 + 20, 21, 12, 2)
    g.fillStyle(0x886633, 1); g.fillRect(W * 2 + 20, 19, 2, 6)

    // Frame 3: walk 1 — 왼발 앞
    drawBody(W * 3, 1)
    g.fillStyle(0x445566, 1); g.fillRoundedRect(W * 3 + 23, 20, 5, 8, 1)
    g.fillStyle(0xccccdd, 1); g.fillRect(W * 3 + 25, 12, 2, 14)
    g.fillStyle(0x886633, 1); g.fillRect(W * 3 + 23, 25, 6, 2)

    // Frame 4: walk 2 — 오른발 앞
    drawBody(W * 4, 2)
    g.fillStyle(0x445566, 1); g.fillRoundedRect(W * 4 + 23, 20, 5, 8, 1)
    g.fillStyle(0xccccdd, 1); g.fillRect(W * 4 + 25, 12, 2, 14)
    g.fillStyle(0x886633, 1); g.fillRect(W * 4 + 23, 25, 6, 2)

    g.generateTexture(PLAYER_SPRITESHEET_KEYS.Warrior, W * 5, 48)
    g.destroy()
    this.registerSpritesheet(PLAYER_SPRITESHEET_KEYS.Warrior, W, 48, 5)
  }

  // Mage: 로브, 지팡이, 후드 (5프레임: idle, attack×2, walk×2)
  private createMageSpritesheet(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    const W = 32

    const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
      g.fillStyle(0x443366, 1); g.fillCircle(ox + 16, 8, 7)
      g.fillStyle(0x332255, 1); g.fillTriangle(ox + 10, 4, ox + 16, 0, ox + 22, 4)
      g.fillStyle(0x221133, 1); g.fillCircle(ox + 16, 9, 4)
      g.fillStyle(0xaa88ff, 0.8)
      g.fillCircle(ox + 14, 8, 1.5); g.fillCircle(ox + 18, 8, 1.5)
      g.fillStyle(0x443366, 1); g.fillTriangle(ox + 6, 44, ox + 16, 15, ox + 26, 44)
      g.fillStyle(0x554477, 1); g.fillRect(ox + 13, 16, 6, 10)
      g.fillStyle(0xaa8833, 1); g.fillRect(ox + 10, 26, 12, 2)
      if (walkPhase === 1) {
        g.fillStyle(0x332255, 1)
        g.fillRoundedRect(ox + 9, 42, 5, 4, 1); g.fillRoundedRect(ox + 19, 44, 5, 3, 1)
      } else if (walkPhase === 2) {
        g.fillStyle(0x332255, 1)
        g.fillRoundedRect(ox + 9, 44, 5, 3, 1); g.fillRoundedRect(ox + 19, 42, 5, 4, 1)
      }
    }

    // Frame 0: idle — 지팡이 수직
    drawBody(0)
    g.fillStyle(0x443366, 1)
    g.fillRoundedRect(5, 20, 5, 8, 1); g.fillRoundedRect(22, 20, 5, 8, 1)
    g.fillStyle(0x886644, 1); g.fillRect(25, 6, 2, 34)
    g.fillStyle(0xaa66ff, 0.9); g.fillCircle(26, 5, 4)
    g.fillStyle(0xcc99ff, 0.6); g.fillCircle(26, 5, 2)

    // Frame 1: 캐스팅 준비 — 양손 들어올림, 보주 밝아짐
    drawBody(W)
    g.fillStyle(0x443366, 1)
    g.fillRoundedRect(W + 4, 14, 5, 8, 1); g.fillRoundedRect(W + 22, 14, 5, 8, 1)
    g.fillStyle(0x886644, 1); g.fillRect(W + 25, 2, 2, 30)
    g.fillStyle(0xcc88ff, 0.9); g.fillCircle(W + 26, 2, 5)
    g.fillStyle(0xeeccff, 0.7); g.fillCircle(W + 26, 2, 3)

    // Frame 2: 캐스팅 발동 — 양손 앞으로, 보주 최대 발광
    drawBody(W * 2)
    g.fillStyle(0x443366, 1)
    g.fillRoundedRect(W * 2 + 3, 18, 6, 6, 1); g.fillRoundedRect(W * 2 + 23, 18, 6, 6, 1)
    g.fillStyle(0x886644, 1); g.fillRect(W * 2 + 25, 4, 2, 28)
    g.fillStyle(0xdd99ff, 0.9); g.fillCircle(W * 2 + 26, 3, 6)
    g.fillStyle(0xffffff, 0.5); g.fillCircle(W * 2 + 26, 3, 3)

    // Frame 3: walk 1 — 왼발 앞
    drawBody(W * 3, 1)
    g.fillStyle(0x443366, 1)
    g.fillRoundedRect(W * 3 + 5, 20, 5, 8, 1); g.fillRoundedRect(W * 3 + 22, 20, 5, 8, 1)
    g.fillStyle(0x886644, 1); g.fillRect(W * 3 + 25, 6, 2, 34)
    g.fillStyle(0xaa66ff, 0.9); g.fillCircle(W * 3 + 26, 5, 4)
    g.fillStyle(0xcc99ff, 0.6); g.fillCircle(W * 3 + 26, 5, 2)

    // Frame 4: walk 2 — 오른발 앞
    drawBody(W * 4, 2)
    g.fillStyle(0x443366, 1)
    g.fillRoundedRect(W * 4 + 5, 20, 5, 8, 1); g.fillRoundedRect(W * 4 + 22, 20, 5, 8, 1)
    g.fillStyle(0x886644, 1); g.fillRect(W * 4 + 25, 6, 2, 34)
    g.fillStyle(0xaa66ff, 0.9); g.fillCircle(W * 4 + 26, 5, 4)
    g.fillStyle(0xcc99ff, 0.6); g.fillCircle(W * 4 + 26, 5, 2)

    g.generateTexture(PLAYER_SPRITESHEET_KEYS.Mage, W * 5, 48)
    g.destroy()
    this.registerSpritesheet(PLAYER_SPRITESHEET_KEYS.Mage, W, 48, 5)
  }

  // Paladin: 성기사, 중갑+십자 문양, 망토 (5프레임: idle, attack×2, walk×2)
  private createPaladinSpritesheet(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    const W = 32

    const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
      g.fillStyle(0xccaa44, 1); g.fillCircle(ox + 16, 8, 7)
      g.fillStyle(0xddbb55, 1)
      g.fillTriangle(ox + 6, 6, ox + 10, 0, ox + 12, 8)
      g.fillTriangle(ox + 20, 8, ox + 22, 0, ox + 26, 6)
      g.fillStyle(0x222222, 1); g.fillRect(ox + 12, 7, 8, 2)
      g.fillStyle(0xddddee, 0.6)
      g.fillTriangle(ox + 8, 15, ox + 16, 14, ox + 24, 15)
      g.fillTriangle(ox + 5, 42, ox + 16, 15, ox + 27, 42)
      g.fillStyle(0xccaa44, 1); g.fillRoundedRect(ox + 8, 15, 16, 14, 2)
      g.fillStyle(0xeedd66, 1)
      g.fillRect(ox + 14, 17, 4, 10); g.fillRect(ox + 11, 20, 10, 3)
      g.fillStyle(0xddbb55, 1)
      g.fillRoundedRect(ox + 4, 14, 7, 6, 2); g.fillRoundedRect(ox + 21, 14, 7, 6, 2)
      g.fillStyle(0xbbaa44, 1)
      g.fillRoundedRect(ox + 4, 20, 5, 9, 1)
      const lS = walkPhase === 1 ? -3 : walkPhase === 2 ? 3 : 0
      const rS = walkPhase === 1 ? 3 : walkPhase === 2 ? -3 : 0
      g.fillRoundedRect(ox + 10, 29 + lS, 5, 11, 1); g.fillRoundedRect(ox + 17, 29 + rS, 5, 11, 1)
      g.fillStyle(0xaa8833, 1)
      g.fillRoundedRect(ox + 9, 38 + lS, 7, 5, 1); g.fillRoundedRect(ox + 16, 38 + rS, 7, 5, 1)
    }

    // Frame 0: idle — 해머 옆으로
    drawBody(0)
    g.fillStyle(0xbbaa44, 1); g.fillRoundedRect(23, 20, 5, 9, 1)
    g.fillStyle(0x887733, 1); g.fillRect(25, 10, 2, 18)
    g.fillStyle(0xccaa44, 1); g.fillRect(22, 8, 8, 5)

    // Frame 1: 해머 들어올리기 (머리 위)
    drawBody(W)
    g.fillStyle(0xbbaa44, 1); g.fillRoundedRect(W + 22, 12, 5, 8, 1)
    g.fillStyle(0x887733, 1); g.fillRect(W + 20, 2, 2, 14)
    g.fillStyle(0xccaa44, 1); g.fillRect(W + 17, 0, 8, 5)

    // Frame 2: 해머 내리치기 (아래로)
    drawBody(W * 2)
    g.fillStyle(0xbbaa44, 1); g.fillRoundedRect(W * 2 + 22, 22, 8, 5, 1)
    g.fillStyle(0x887733, 1); g.fillRect(W * 2 + 24, 18, 2, 14)
    g.fillStyle(0xccaa44, 1); g.fillRect(W * 2 + 21, 30, 8, 5)

    // Frame 3: walk 1 — 왼발 앞
    drawBody(W * 3, 1)
    g.fillStyle(0xbbaa44, 1); g.fillRoundedRect(W * 3 + 23, 20, 5, 9, 1)
    g.fillStyle(0x887733, 1); g.fillRect(W * 3 + 25, 10, 2, 18)
    g.fillStyle(0xccaa44, 1); g.fillRect(W * 3 + 22, 8, 8, 5)

    // Frame 4: walk 2 — 오른발 앞
    drawBody(W * 4, 2)
    g.fillStyle(0xbbaa44, 1); g.fillRoundedRect(W * 4 + 23, 20, 5, 9, 1)
    g.fillStyle(0x887733, 1); g.fillRect(W * 4 + 25, 10, 2, 18)
    g.fillStyle(0xccaa44, 1); g.fillRect(W * 4 + 22, 8, 8, 5)

    g.generateTexture(PLAYER_SPRITESHEET_KEYS.Paladin, W * 5, 48)
    g.destroy()
    this.registerSpritesheet(PLAYER_SPRITESHEET_KEYS.Paladin, W, 48, 5)
  }

  // Archer: 슬림, 활, 두건+망토 (5프레임: idle, attack×2, walk×2)
  private createArcherSpritesheet(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    const W = 32

    const drawBody = (ox: number, walkPhase: 0 | 1 | 2 = 0): void => {
      g.fillStyle(0x336633, 1); g.fillCircle(ox + 16, 8, 6)
      g.fillStyle(0x447744, 1); g.fillTriangle(ox + 13, 3, ox + 16, 0, ox + 19, 3)
      g.fillStyle(0xddbb88, 1); g.fillCircle(ox + 16, 9, 4)
      g.fillStyle(0x224422, 1)
      g.fillCircle(ox + 14, 8, 1); g.fillCircle(ox + 18, 8, 1)
      g.fillStyle(0x557755, 1); g.fillRoundedRect(ox + 10, 15, 12, 12, 2)
      g.fillStyle(0x775533, 1); g.fillRect(ox + 10, 25, 12, 2)
      g.fillStyle(0x336633, 0.5)
      g.fillTriangle(ox + 8, 15, ox + 16, 14, ox + 24, 15)
      g.fillTriangle(ox + 7, 38, ox + 16, 15, ox + 25, 38)
      g.fillStyle(0x557755, 1); g.fillRoundedRect(ox + 6, 17, 4, 8, 1)
      g.fillStyle(0x664422, 1); g.fillRect(ox + 6, 16, 3, 14)
      g.fillStyle(0xcccccc, 1)
      g.fillRect(ox + 6, 14, 1, 4); g.fillRect(ox + 8, 14, 1, 3)
      const lS = walkPhase === 1 ? -3 : walkPhase === 2 ? 3 : 0
      const rS = walkPhase === 1 ? 3 : walkPhase === 2 ? -3 : 0
      g.fillStyle(0x557755, 1)
      g.fillRoundedRect(ox + 11, 27 + lS, 4, 12, 1); g.fillRoundedRect(ox + 17, 27 + rS, 4, 12, 1)
      g.fillStyle(0x664422, 1)
      g.fillRoundedRect(ox + 10, 37 + lS, 6, 5, 1); g.fillRoundedRect(ox + 16, 37 + rS, 6, 5, 1)
    }

    // Frame 0: idle — 활 쉬는 자세
    drawBody(0)
    g.fillStyle(0x557755, 1); g.fillRoundedRect(22, 17, 4, 8, 1)
    g.lineStyle(2, 0x886644, 1)
    g.beginPath(); g.arc(28, 18, 14, -1.2, 1.2, false); g.strokePath()
    g.lineStyle(1, 0xcccccc, 0.8)
    g.beginPath(); g.moveTo(28, 5); g.lineTo(28, 31); g.strokePath()

    // Frame 1: 활줄 당기기
    drawBody(W)
    g.fillStyle(0x557755, 1); g.fillRoundedRect(W + 22, 17, 4, 8, 1)
    g.lineStyle(2, 0x886644, 1)
    g.beginPath(); g.arc(W + 29, 18, 12, -1.0, 1.0, false); g.strokePath()
    g.lineStyle(1, 0xcccccc, 0.8)
    g.beginPath(); g.moveTo(W + 29, 7); g.lineTo(W + 22, 18); g.lineTo(W + 29, 29); g.strokePath()
    // 화살
    g.fillStyle(0xcccccc, 1); g.fillRect(W + 18, 17, 8, 1)
    g.fillStyle(0xaaaaaa, 1); g.fillTriangle(W + 17, 16, W + 17, 19, W + 15, 17)

    // Frame 2: 화살 발사
    drawBody(W * 2)
    g.fillStyle(0x557755, 1); g.fillRoundedRect(W * 2 + 22, 17, 4, 8, 1)
    g.lineStyle(2, 0x886644, 1)
    g.beginPath(); g.arc(W * 2 + 28, 18, 14, -1.2, 1.2, false); g.strokePath()
    g.lineStyle(1, 0xcccccc, 0.8)
    g.beginPath(); g.moveTo(W * 2 + 28, 5); g.lineTo(W * 2 + 28, 31); g.strokePath()

    // Frame 3: walk 1 — 왼발 앞
    drawBody(W * 3, 1)
    g.fillStyle(0x557755, 1); g.fillRoundedRect(W * 3 + 22, 17, 4, 8, 1)
    g.lineStyle(2, 0x886644, 1)
    g.beginPath(); g.arc(W * 3 + 28, 18, 14, -1.2, 1.2, false); g.strokePath()
    g.lineStyle(1, 0xcccccc, 0.8)
    g.beginPath(); g.moveTo(W * 3 + 28, 5); g.lineTo(W * 3 + 28, 31); g.strokePath()

    // Frame 4: walk 2 — 오른발 앞
    drawBody(W * 4, 2)
    g.fillStyle(0x557755, 1); g.fillRoundedRect(W * 4 + 22, 17, 4, 8, 1)
    g.lineStyle(2, 0x886644, 1)
    g.beginPath(); g.arc(W * 4 + 28, 18, 14, -1.2, 1.2, false); g.strokePath()
    g.lineStyle(1, 0xcccccc, 0.8)
    g.beginPath(); g.moveTo(W * 4 + 28, 5); g.lineTo(W * 4 + 28, 31); g.strokePath()

    g.generateTexture(PLAYER_SPRITESHEET_KEYS.Archer, W * 5, 48)
    g.destroy()
    this.registerSpritesheet(PLAYER_SPRITESHEET_KEYS.Archer, W, 48, 5)
  }

  // --- 클래스별 애니메이션 등록 ---
  private registerPlayerAnimations(): void {
    const classes: readonly ('Warrior' | 'Mage' | 'Paladin' | 'Archer')[] = ['Warrior', 'Mage', 'Paladin', 'Archer']
    for (const cls of classes) {
      const ssKey = PLAYER_SPRITESHEET_KEYS[cls]
      const animKeys = PLAYER_ANIM_KEYS[cls]

      this.anims.create({
        key: animKeys.idle,
        frames: [{ key: ssKey, frame: 0 }],
        repeat: -1,
      })

      this.anims.create({
        key: animKeys.attack,
        frames: [{ key: ssKey, frame: 1 }, { key: ssKey, frame: 2 }],
        frameRate: 8,
        repeat: 0,
      })

      this.anims.create({
        key: animKeys.walk,
        frames: [{ key: ssKey, frame: 3 }, { key: ssKey, frame: 4 }],
        frameRate: 6,
        repeat: -1,
      })
    }
  }

  // --- 몬스터 등급별 텍스처 ---

  private createMonsterTextures(): void {
    this.createNormalMonsterTexture()
    this.createEliteMonsterTexture()
    this.createBossMonsterTexture()
  }

  // 일반 몬스터 (24x24): 어둡고 작은 인간형 크리처
  private createNormalMonsterTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    // 머리 (날카로운 형태)
    g.fillStyle(0x884422, 1)
    g.fillCircle(12, 5, 5)
    // 붉은 눈
    g.fillStyle(0xff2200, 1)
    g.fillCircle(10, 4, 1.5)
    g.fillCircle(14, 4, 1.5)
    // 몸통
    g.fillStyle(0x663311, 1)
    g.fillRoundedRect(7, 10, 10, 7, 2)
    // 팔 (날카로운 발톱)
    g.fillStyle(0x774422, 1)
    g.fillRoundedRect(3, 11, 4, 6, 1)
    g.fillRoundedRect(17, 11, 4, 6, 1)
    // 발톱
    g.fillStyle(0xccaa77, 1)
    g.fillTriangle(2, 17, 4, 14, 5, 17)
    g.fillTriangle(17, 17, 19, 14, 21, 17)
    // 다리
    g.fillStyle(0x663311, 1)
    g.fillRoundedRect(8, 17, 3, 5, 1)
    g.fillRoundedRect(13, 17, 3, 5, 1)
    g.generateTexture(MONSTER_TEXTURES.normal, 24, 24)
    g.destroy()
  }

  // 엘리트 몬스터 (32x32): 뿔+갑옷, 위협적
  private createEliteMonsterTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    // 뿔
    g.fillStyle(0xaa6633, 1)
    g.fillTriangle(6, 8, 9, 0, 11, 8) // 왼쪽 뿔
    g.fillTriangle(21, 8, 23, 0, 26, 8) // 오른쪽 뿔
    // 머리 (헬멧형)
    g.fillStyle(0x664422, 1)
    g.fillCircle(16, 9, 7)
    // 붉은 눈 (더 밝게)
    g.fillStyle(0xff4400, 1)
    g.fillCircle(13, 8, 2)
    g.fillCircle(19, 8, 2)
    g.fillStyle(0xffaa00, 1)
    g.fillCircle(13, 8, 1)
    g.fillCircle(19, 8, 1)
    // 갑옷 몸통
    g.fillStyle(0x554433, 1)
    g.fillRoundedRect(8, 16, 16, 9, 2)
    // 갑옷 장식
    g.fillStyle(0x776655, 1)
    g.fillRect(14, 17, 4, 7)
    // 어깨 갑옷 (스파이크)
    g.fillStyle(0x665544, 1)
    g.fillRoundedRect(3, 15, 7, 5, 1)
    g.fillRoundedRect(22, 15, 7, 5, 1)
    g.fillStyle(0x887766, 1)
    g.fillTriangle(4, 15, 6, 11, 8, 15) // 왼쪽 스파이크
    g.fillTriangle(24, 15, 26, 11, 28, 15) // 오른쪽 스파이크
    // 팔
    g.fillStyle(0x554433, 1)
    g.fillRoundedRect(4, 20, 5, 7, 1)
    g.fillRoundedRect(23, 20, 5, 7, 1)
    // 다리
    g.fillStyle(0x443322, 1)
    g.fillRoundedRect(10, 25, 5, 6, 1)
    g.fillRoundedRect(17, 25, 5, 6, 1)
    g.generateTexture(MONSTER_TEXTURES.elite, 32, 32)
    g.destroy()
  }

  // 보스 (48x64): 대형 마왕 실루엣
  private createBossMonsterTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    // 거대한 뿔
    g.fillStyle(0x882211, 1)
    g.fillTriangle(4, 14, 10, 0, 14, 14) // 왼쪽 뿔
    g.fillTriangle(34, 14, 38, 0, 44, 14) // 오른쪽 뿔
    // 두개골 형태 머리
    g.fillStyle(0x553322, 1)
    g.fillCircle(24, 14, 11)
    // 왕관/뿔 장식
    g.fillStyle(0xaa4422, 1)
    g.fillTriangle(16, 8, 19, 3, 22, 8)
    g.fillTriangle(26, 8, 29, 3, 32, 8)
    // 타오르는 눈
    g.fillStyle(0xff2200, 1)
    g.fillCircle(19, 13, 3)
    g.fillCircle(29, 13, 3)
    g.fillStyle(0xffaa00, 1)
    g.fillCircle(19, 13, 1.5)
    g.fillCircle(29, 13, 1.5)
    // 입 (이빨)
    g.fillStyle(0x221100, 1)
    g.fillRect(18, 19, 12, 4)
    g.fillStyle(0xccaa88, 1)
    g.fillTriangle(19, 19, 21, 23, 23, 19) // 이빨 1
    g.fillTriangle(25, 19, 27, 23, 29, 19) // 이빨 2
    // 거대한 갑옷 몸통
    g.fillStyle(0x443322, 1)
    g.fillRoundedRect(8, 25, 32, 20, 3)
    // 갑옷 문양 (해골)
    g.fillStyle(0x665544, 1)
    g.fillCircle(24, 33, 5)
    g.fillStyle(0x443322, 1)
    g.fillCircle(22, 32, 1.5) // 해골 눈
    g.fillCircle(26, 32, 1.5)
    // 어깨 갑옷 (스파이크)
    g.fillStyle(0x665544, 1)
    g.fillRoundedRect(2, 24, 10, 8, 2)
    g.fillRoundedRect(36, 24, 10, 8, 2)
    g.fillStyle(0x887766, 1)
    g.fillTriangle(3, 24, 7, 18, 11, 24)
    g.fillTriangle(37, 24, 41, 18, 45, 24)
    // 팔 (거대)
    g.fillStyle(0x443322, 1)
    g.fillRoundedRect(2, 32, 8, 14, 2)
    g.fillRoundedRect(38, 32, 8, 14, 2)
    // 발톱
    g.fillStyle(0xaa8866, 1)
    g.fillTriangle(1, 46, 5, 42, 6, 46)
    g.fillTriangle(42, 46, 43, 42, 47, 46)
    // 다리
    g.fillStyle(0x332211, 1)
    g.fillRoundedRect(12, 45, 8, 14, 2)
    g.fillRoundedRect(28, 45, 8, 14, 2)
    // 부츠/발톱
    g.fillStyle(0x554433, 1)
    g.fillRoundedRect(10, 56, 12, 6, 2)
    g.fillRoundedRect(26, 56, 12, 6, 2)
    g.generateTexture(MONSTER_TEXTURES.boss, 48, 64)
    g.destroy()
  }

  // --- 투사체 텍스처 (16x6): 화살 ---

  private createProjectileTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    // 화살대 (shaft)
    g.fillStyle(0x8b6914, 1)
    g.fillRect(2, 2, 10, 2)
    // 화살촉 (arrowhead)
    g.fillStyle(0xcccccc, 1)
    g.fillTriangle(12, 0, 16, 3, 12, 6)
    // 깃 (fletching)
    g.fillStyle(0xcc3333, 0.8)
    g.fillTriangle(0, 0, 3, 3, 0, 6)
    g.generateTexture(PROJECTILE_TEXTURE, 16, 6)
    g.destroy()
  }

  // --- 맵별 배경 타일 텍스처 (32x32) ---

  private createBackgroundTextures(): void {
    this.createTownBackground()
    this.createForestBackground()
    this.createIceCaveBackground()
    this.createFlameCastleBackground()
  }

  // 마을: 밝은 돌바닥 타일
  private createTownBackground(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x3a3a2e, 1)
    g.fillRect(0, 0, 32, 32)
    // 돌 타일 줄눈
    g.lineStyle(1, 0x2a2a22, 0.6)
    g.strokeRect(1, 1, 14, 14) // 좌상단 돌
    g.strokeRect(17, 1, 14, 14) // 우상단 돌
    g.strokeRect(1, 17, 14, 14) // 좌하단 돌
    g.strokeRect(17, 17, 14, 14) // 우하단 돌
    // 돌 표면 텍스처
    g.fillStyle(0x444438, 0.3)
    g.fillRect(4, 4, 3, 2)
    g.fillRect(20, 8, 4, 2)
    g.fillRect(6, 22, 2, 3)
    g.fillRect(24, 20, 3, 2)
    g.generateTexture(BG_TEXTURES.town, 32, 32)
    g.destroy()
  }

  // 뱀의 숲: 어두운 풀/흙 패턴
  private createForestBackground(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x1a2a1a, 1)
    g.fillRect(0, 0, 32, 32)
    // 풀 패턴
    g.fillStyle(0x223322, 0.5)
    g.fillRect(2, 5, 6, 3)
    g.fillRect(14, 2, 4, 4)
    g.fillRect(24, 12, 5, 3)
    g.fillRect(8, 20, 4, 5)
    g.fillRect(20, 24, 6, 3)
    // 뿌리/덩굴 선
    g.lineStyle(1, 0x2a4422, 0.4)
    g.beginPath()
    g.moveTo(0, 16)
    g.lineTo(12, 18)
    g.lineTo(20, 14)
    g.lineTo(32, 16)
    g.strokePath()
    // 어두운 얼룩
    g.fillStyle(0x111a11, 0.3)
    g.fillCircle(8, 10, 3)
    g.fillCircle(26, 28, 2)
    g.generateTexture(BG_TEXTURES.serpent_forest, 32, 32)
    g.destroy()
  }

  // 얼음 동굴: 파란 빙결 패턴
  private createIceCaveBackground(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x1a2233, 1)
    g.fillRect(0, 0, 32, 32)
    // 빙결 균열
    g.lineStyle(1, 0x3355aa, 0.3)
    g.beginPath()
    g.moveTo(0, 8)
    g.lineTo(16, 12)
    g.lineTo(32, 6)
    g.strokePath()
    g.beginPath()
    g.moveTo(4, 28)
    g.lineTo(20, 22)
    g.lineTo(32, 26)
    g.strokePath()
    // 빛 반사
    g.fillStyle(0x4488cc, 0.15)
    g.fillRect(6, 4, 8, 3)
    g.fillRect(22, 18, 6, 3)
    g.fillStyle(0x6699dd, 0.1)
    g.fillCircle(14, 24, 4)
    g.generateTexture(BG_TEXTURES.ice_cave, 32, 32)
    g.destroy()
  }

  // 화염의 성: 어두운 붉은 돌 패턴
  private createFlameCastleBackground(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x2a1a1a, 1)
    g.fillRect(0, 0, 32, 32)
    // 용암 빛 줄기
    g.fillStyle(0x442211, 0.4)
    g.fillRect(0, 14, 32, 4)
    g.fillStyle(0x663311, 0.2)
    g.fillRect(8, 2, 3, 6)
    g.fillRect(22, 22, 4, 5)
    // 화염 점
    g.fillStyle(0xff4400, 0.1)
    g.fillCircle(6, 8, 2)
    g.fillCircle(26, 6, 1.5)
    g.fillCircle(16, 26, 2)
    // 돌 균열
    g.lineStyle(1, 0x331111, 0.5)
    g.beginPath()
    g.moveTo(2, 0)
    g.lineTo(8, 12)
    g.lineTo(4, 32)
    g.strokePath()
    g.beginPath()
    g.moveTo(24, 0)
    g.lineTo(28, 16)
    g.lineTo(22, 32)
    g.strokePath()
    g.generateTexture(BG_TEXTURES.flame_castle, 32, 32)
    g.destroy()
  }
}
