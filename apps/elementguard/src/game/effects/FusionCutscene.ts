import Phaser from 'phaser'
import type { FusionElement } from '@/types'
import { FUSION_COLORS } from '@/game/systems/ElementSystem'

const FUSION_LABELS: Record<FusionElement, string> = {
  plasma: '⚡🔥 플라즈마',
  frost: '💧💨 프로스트',
  lava: '🔥🪨 라바',
  storm: '💨⚡ 스톰',
  swamp: '🪨💧 스왐프',
  heatwave: '🔥💨 히트웨이브',
}

// 2초 융합 컷신
export const playFusionCutscene = (scene: Phaser.Scene, x: number, y: number, fusionElement: FusionElement, onComplete?: () => void) => {
  const { width, height } = scene.scale
  const color = FUSION_COLORS[fusionElement] ?? 0xffffff

  // 배경 어둡게
  const dimBg = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
  dimBg.setDepth(180)
  scene.tweens.add({
    targets: dimBg,
    fillAlpha: 0.5,
    duration: 200,
  })

  // 두 에너지 구체 (좌측 + 우측에서 중앙으로)
  const orbLeft = scene.add.circle(x - 80, y, 12, color, 0.8)
  orbLeft.setDepth(181)
  const orbRight = scene.add.circle(x + 80, y, 12, color, 0.8)
  orbRight.setDepth(181)

  // 충돌 이동
  scene.tweens.add({
    targets: orbLeft,
    x: x,
    duration: 600,
    ease: 'Power2',
  })
  scene.tweens.add({
    targets: orbRight,
    x: x,
    duration: 600,
    ease: 'Power2',
  })

  // 충돌 후 폭발
  scene.time.delayedCall(650, () => {
    orbLeft.destroy()
    orbRight.destroy()

    // 폭발 링
    const ring = scene.add.circle(x, y, 10, color, 0.7)
    ring.setDepth(182)
    scene.tweens.add({
      targets: ring,
      radius: 60,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    })

    // 파티클 산개
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      const p = scene.add.circle(x, y, 4, color, 0.9)
      p.setDepth(182)
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 50,
        y: y + Math.sin(angle) * 50,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        delay: 50,
        onComplete: () => p.destroy(),
      })
    }

    // 플래시
    const flash = scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.4)
    flash.setDepth(183)
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    })
  })

  // 융합 이름 표시
  const label = FUSION_LABELS[fusionElement] ?? fusionElement
  scene.time.delayedCall(900, () => {
    const nameText = scene.add.text(x, y - 40, label, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    nameText.setOrigin(0.5)
    nameText.setDepth(184)

    scene.tweens.add({
      targets: nameText,
      y: y - 60,
      alpha: 0,
      duration: 800,
      delay: 600,
      onComplete: () => nameText.destroy(),
    })
  })

  // 2초 후 정리
  scene.time.delayedCall(2000, () => {
    scene.tweens.add({
      targets: dimBg,
      fillAlpha: 0,
      duration: 200,
      onComplete: () => {
        dimBg.destroy()
        onComplete?.()
      },
    })
  })
}
