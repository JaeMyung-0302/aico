import Phaser from 'phaser'
import { WAVES } from '@/game/data/waves'
import { isBossWave } from '@/game/systems/WaveSystem'
import { ELEMENT_COLORS } from '@/game/systems/ElementSystem'
import type { Element } from '@/types'

const ELEMENT_LABELS: Record<Element, string> = {
  fire: '🔥 불',
  water: '💧 물',
  wind: '💨 바람',
  thunder: '⚡ 전기',
  earth: '🪨 땅',
}

// 다음 웨이브 구성 미리보기
export class WavePreview {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Rectangle
  private titleText: Phaser.GameObjects.Text
  private detailText: Phaser.GameObjects.Text
  private isVisible = false
  private hideTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const { width } = scene.scale

    this.container = scene.add.container(width / 2, 70)
    this.container.setDepth(100)

    this.bg = scene.add.rectangle(0, 0, 240, 50, 0x1a1a2e, 0.9)
    this.bg.setStrokeStyle(1, 0x444444, 1)
    this.container.add(this.bg)

    this.titleText = scene.add.text(0, -12, '', {
      fontSize: '12px',
      color: '#ffdd00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      align: 'center',
    })
    this.titleText.setOrigin(0.5)
    this.container.add(this.titleText)

    this.detailText = scene.add.text(0, 8, '', {
      fontSize: '10px',
      color: '#aaaaaa',
      fontFamily: 'sans-serif',
      align: 'center',
    })
    this.detailText.setOrigin(0.5)
    this.container.add(this.detailText)

    this.container.setVisible(false)
  }

  // 웨이브 시작 전 표시
  show(nextWave: number) {
    const waveData = WAVES[nextWave - 1]
    if (!waveData) return

    this.isVisible = true

    // 속성 분포 계산 (enemies: { enemyId, count }[])
    const elementCounts = new Map<Element, number>()
    let totalEnemies = 0
    for (const entry of waveData.enemies) {
      // enemyId에서 속성 추출 (예: fire-imp → fire)
      const element = entry.enemyId.split('-')[0] as Element
      if (element) {
        elementCounts.set(element, (elementCounts.get(element) ?? 0) + entry.count)
      }
      totalEnemies += entry.count
    }

    // 가장 많은 속성 찾기
    let dominantElement: Element = 'fire'
    let maxCount = 0
    for (const [el, count] of elementCounts) {
      if (count > maxCount) {
        maxCount = count
        dominantElement = el
      }
    }

    // 텍스트 구성
    if (isBossWave(nextWave)) {
      this.titleText.setText(`⚠️ Wave ${nextWave} — 보스 출현!`)
      this.titleText.setColor('#ff4444')
    } else {
      this.titleText.setText(`Wave ${nextWave}`)
      this.titleText.setColor('#ffdd00')
    }

    const elementLabel = ELEMENT_LABELS[dominantElement] ?? dominantElement
    this.detailText.setText(`적 ${totalEnemies}마리 | 주 속성: ${elementLabel}`)

    // 배경 색상에 주 속성 반영
    const dominantColor = ELEMENT_COLORS[dominantElement] ?? 0x333333
    this.bg.setFillStyle(dominantColor, 0.15)

    this.container.setVisible(true)

    // 이전 타이머 취소 후 3초 후 자동 숨김
    this.hideTimer?.destroy()
    this.hideTimer = this.scene.time.delayedCall(3000, () => this.hide())
  }

  hide() {
    if (!this.isVisible) return
    this.isVisible = false

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.container.setVisible(false)
        this.container.setAlpha(1)
      },
    })
  }

  destroy() {
    this.hideTimer?.destroy()
    this.container.destroy()
  }
}
