import Phaser from 'phaser'

/**
 * Juiciness: 화면 흔들림, 히트스톱, 사망 파티클, 데미지 텍스트
 */

// 화면 흔들림
export const screenShake = (scene: Phaser.Scene, intensity = 0.005, duration = 100): void => {
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

// 사망 파티클
export const spawnDeathParticles = (scene: Phaser.Scene, x: number, y: number): void => {
  const colors = [0xff4444, 0xff8800, 0xffcc00]

  for (let i = 0; i < 6; i++) {
    const color = colors[i % colors.length] as number
    const particle = scene.add.circle(x, y, 3, color)
    particle.setDepth(15)

    const angle = (Math.PI * 2 * i) / 6
    const speed = 80 + Math.random() * 60

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      scale: 0.3,
      duration: 300 + Math.random() * 200,
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
  const text = scene.add.text(x, y - 10, isPlayerHit ? `-${damage}` : String(damage), {
    fontSize,
    color: isPlayerHit ? '#ff6666' : color,
    fontFamily: 'monospace',
    fontStyle: isPlayerHit || isCrit ? 'bold' : 'normal',
    stroke: '#000000',
    strokeThickness: isPlayerHit ? 4 : 2,
  })
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
