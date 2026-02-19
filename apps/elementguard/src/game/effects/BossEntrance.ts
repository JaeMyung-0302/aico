import Phaser from 'phaser'

// 보스 등장 연출 (화면 흔들림 + 경고 텍스트 + 적색 섬광)
export const playBossEntrance = (scene: Phaser.Scene, onComplete?: () => void) => {
  const { width, height } = scene.scale

  // 화면 흔들림
  scene.cameras.main.shake(500, 0.01)

  // 적색 섬광
  const flash = scene.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0)
  flash.setDepth(190)

  scene.tweens.add({
    targets: flash,
    fillAlpha: 0.25,
    duration: 200,
    yoyo: true,
    repeat: 2,
    onComplete: () => flash.destroy(),
  })

  // 경고 텍스트
  const warningText = scene.add.text(width / 2, height / 2, '⚠ BOSS ⚠', {
    fontSize: '32px',
    color: '#ff4444',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  })
  warningText.setOrigin(0.5)
  warningText.setDepth(191)
  warningText.setAlpha(0)
  warningText.setScale(0.5)

  scene.tweens.add({
    targets: warningText,
    alpha: 1,
    scale: 1.2,
    duration: 400,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: warningText,
        alpha: 0,
        scale: 1.5,
        duration: 600,
        delay: 800,
        onComplete: () => {
          warningText.destroy()
          onComplete?.()
        },
      })
    },
  })
}
