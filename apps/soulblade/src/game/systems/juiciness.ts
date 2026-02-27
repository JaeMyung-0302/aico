import Phaser from 'phaser'

/**
 * Juiciness: 화면 흔들림, 히트스톱, 사망 파티클, 데미지 텍스트
 */

// 화면 흔들림
export const screenShake = (
  scene: Phaser.Scene,
  intensity = 0.005,
  duration = 100,
): void => {
  scene.cameras.main.shake(duration, intensity)
}

// 히트스톱 (짧은 프레임 정지) — setTimeout으로 timeScale 복구 보장
let hitStopTimer: ReturnType<typeof setTimeout> | null = null

export const hitStop = (scene: Phaser.Scene, durationMs = 50): void => {
  if (hitStopTimer) clearTimeout(hitStopTimer)
  scene.time.timeScale = 0
  hitStopTimer = setTimeout(() => {
    scene.time.timeScale = 1
    hitStopTimer = null
  }, durationMs)
}

// 사망 파티클 — LOD 연동: 파티클 수/크기/색상 다양화
export const spawnDeathParticles = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 6,
  enableGlow = false,
): void => {
  const colors = [0xff4444, 0xff6633, 0xff8800, 0xffaa00, 0xffcc00, 0xffdd66]

  // 글로우 바닥 이펙트 (full/reduced)
  if (enableGlow) {
    const glow = scene.add.circle(x, y, 12, 0xff6600, 0.25)
    glow.setDepth(15)
    scene.tweens.add({
      targets: glow,
      scale: 2.5,
      alpha: 0,
      duration: 350,
      onComplete: () => glow.destroy(),
    })
  }

  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length] as number
    const size = 2 + Math.random() * 3 // 크기 변이 (2~5)
    const particle = scene.add.circle(x, y, size, color)
    particle.setDepth(15)

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
    const speed = 70 + Math.random() * 80

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      scale: 0.2,
      duration: 300 + Math.random() * 300,
      onComplete: () => particle.destroy(),
    })
  }
}

// 데미지 텍스트 팝업
export const showDamageNumber = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  isCrit: boolean,
  overrideColor?: string,
): void => {
  const isPlayerHit = overrideColor === '#ff4444'
  const color = overrideColor ?? (isCrit ? '#ffcc00' : '#ffffff')
  const fontSize = isPlayerHit ? '20px' : isCrit ? '18px' : '14px'
  const text = scene.add.text(
    x,
    y - 10,
    isPlayerHit ? `-${damage}` : String(damage),
    {
      fontSize,
      color: isPlayerHit ? '#ff6666' : color,
      fontFamily: 'monospace',
      fontStyle: isPlayerHit || isCrit ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: isPlayerHit ? 4 : 2,
    },
  )
  text.setOrigin(0.5)
  text.setDepth(20)

  scene.tweens.add({
    targets: text,
    y: y - 40,
    alpha: 0,
    duration: 600,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  })
}
