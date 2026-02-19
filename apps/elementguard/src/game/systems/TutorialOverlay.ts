import Phaser from 'phaser'

type HighlightTarget = 'summon-button' | 'wave-button' | 'grid' | 'unit'

export class TutorialOverlay {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private backdrop: Phaser.GameObjects.Rectangle
  private messageBox: Phaser.GameObjects.Rectangle
  private messageText: Phaser.GameObjects.Text
  private finger: Phaser.GameObjects.Text
  private fingerTween?: Phaser.Tweens.Tween
  private isVisible = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const { width, height } = scene.scale

    this.container = scene.add.container(0, 0)
    this.container.setDepth(200)

    // 반투명 배경
    this.backdrop = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
    this.container.add(this.backdrop)

    // 메시지 박스
    this.messageBox = scene.add.rectangle(width / 2, height * 0.3, width * 0.8, 80, 0x1a1a2e, 0.95)
    this.messageBox.setStrokeStyle(2, 0xffdd00, 1)
    this.messageBox.setOrigin(0.5)
    this.container.add(this.messageBox)

    // 메시지 텍스트
    this.messageText = scene.add.text(width / 2, height * 0.3, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      align: 'center',
      lineSpacing: 6,
    })
    this.messageText.setOrigin(0.5)
    this.container.add(this.messageText)

    // 손가락 아이콘 (이모지)
    this.finger = scene.add.text(0, 0, '👆', {
      fontSize: '28px',
    })
    this.finger.setOrigin(0.5)
    this.container.add(this.finger)

    this.container.setVisible(false)
  }

  show(message: string, highlight?: HighlightTarget) {
    this.isVisible = true
    this.messageText.setText(message)
    this.container.setVisible(true)

    // 메시지 박스 크기 자동 조정
    const textBounds = this.messageText.getBounds()
    this.messageBox.setSize(Math.max(textBounds.width + 40, 200), textBounds.height + 30)

    // 하이라이트 대상 위치
    const pos = this.getHighlightPosition(highlight)
    if (pos) {
      this.finger.setPosition(pos.x, pos.y)
      this.finger.setVisible(true)
      this.animateFinger(pos)
    } else {
      this.finger.setVisible(false)
    }

    // 탭하면 닫기
    this.backdrop.setInteractive()
    this.backdrop.once('pointerdown', () => this.hide())
  }

  hide() {
    if (!this.isVisible) return
    this.isVisible = false
    this.fingerTween?.destroy()
    this.container.setVisible(false)
    this.backdrop.removeInteractive()
  }

  private getHighlightPosition(target?: HighlightTarget): { x: number; y: number } | null {
    const { width, height } = this.scene.scale

    switch (target) {
      case 'summon-button':
        return { x: width / 2 - 130, y: height - 60 }
      case 'wave-button':
        return { x: width / 2 + 10, y: height - 60 }
      case 'grid':
        return { x: width / 2, y: height * 0.55 }
      case 'unit':
        return { x: width / 2, y: height * 0.5 }
      default:
        return null
    }
  }

  private animateFinger(pos: { x: number; y: number }) {
    this.fingerTween?.destroy()
    this.fingerTween = this.scene.tweens.add({
      targets: this.finger,
      y: pos.y - 10,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  destroy() {
    this.fingerTween?.destroy()
    this.container.destroy()
  }
}
