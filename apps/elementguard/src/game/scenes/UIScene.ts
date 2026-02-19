import Phaser from 'phaser'
import { eventBus } from '@/lib/event-bus'

interface GameState {
  wave: number
  gold: number
  hp: number
  maxHp: number
  score: number
  unitCount: number
  isWaveActive: boolean
}

export class UIScene extends Phaser.Scene {
  private waveText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text
  private hpText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private summonButton!: Phaser.GameObjects.Container
  private waveButton!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'UIScene' })
  }

  create() {
    const { width, height } = this.scale
    const padding = 12

    // === 상단 HUD ===
    const hudY = padding

    // 웨이브 표시
    this.waveText = this.add.text(padding, hudY, 'Wave: 0/30', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    })

    // 점수 (우측 상단)
    this.scoreText = this.add.text(width - padding, hudY, 'Score: 0', {
      fontSize: '14px',
      color: '#ffdd00',
      fontFamily: 'sans-serif',
    })
    this.scoreText.setOrigin(1, 0)

    // 골드 (좌측 상단 2줄째)
    this.goldText = this.add.text(padding, hudY + 24, 'Gold: 30', {
      fontSize: '14px',
      color: '#ffd700',
      fontFamily: 'sans-serif',
    })

    // HP (우측 상단 2줄째)
    this.hpText = this.add.text(width - padding, hudY + 24, 'HP: 100/100', {
      fontSize: '14px',
      color: '#44ff44',
      fontFamily: 'sans-serif',
    })
    this.hpText.setOrigin(1, 0)

    // === 하단 버튼 ===
    const btnY = height - 60
    const btnWidth = 120
    const btnHeight = 44

    // 소환 버튼
    this.summonButton = this.createButton(
      width / 2 - btnWidth - 10,
      btnY,
      btnWidth,
      btnHeight,
      '소환 (10G)',
      0x4488ff,
      () => eventBus.emit('summon-unit'),
    )

    // 웨이브 시작 버튼
    this.waveButton = this.createButton(
      width / 2 + 10,
      btnY,
      btnWidth,
      btnHeight,
      'Wave 시작',
      0xff4444,
      () => eventBus.emit('start-wave'),
    )

    // 게임 상태 업데이트 리스너
    eventBus.on('game-state-update', this.handleGameStateUpdate as (...args: unknown[]) => void)
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x + w / 2, y)

    const bg = this.add.rectangle(0, 0, w, h, color, 0.8)
    bg.setStrokeStyle(1, 0xffffff, 0.5)
    container.add(bg)

    const text = this.add.text(0, 0, label, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    })
    text.setOrigin(0.5, 0.5)
    container.add(text)

    container.setSize(w, h)
    container.setInteractive()
    container.on('pointerdown', onClick)
    container.on('pointerover', () => bg.setAlpha(1))
    container.on('pointerout', () => bg.setAlpha(0.8))

    return container
  }

  private handleGameStateUpdate = (state: GameState) => {
    this.waveText.setText(`Wave: ${state.wave}/30`)
    this.goldText.setText(`Gold: ${state.gold}`)
    this.hpText.setText(`HP: ${state.hp}/${state.maxHp}`)
    this.scoreText.setText(`Score: ${state.score}`)

    // HP 색상 변경
    if (state.hp / state.maxHp > 0.5) {
      this.hpText.setColor('#44ff44')
    } else if (state.hp / state.maxHp > 0.25) {
      this.hpText.setColor('#ffff44')
    } else {
      this.hpText.setColor('#ff4444')
    }
  }

  shutdown() {
    eventBus.off('game-state-update', this.handleGameStateUpdate as (...args: unknown[]) => void)
  }
}
