import Phaser from 'phaser'
import type { EnemyData } from '@/types'
import { EnemyEntity } from './Enemy'

export class BossEntity extends EnemyEntity {
  private abilityTimer: Phaser.Time.TimerEvent | null = null

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyData: EnemyData,
    scaledHp: number,
  ) {
    super(scene, x, y, enemyData, scaledHp)

    // 보스 출현 연출
    this.setScale(0)
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    })
  }

  startAbilityLoop(callback: () => void, interval: number = 3000) {
    this.abilityTimer = this.scene.time.addEvent({
      delay: interval,
      callback,
      loop: true,
    })
  }

  destroy(fromScene?: boolean) {
    this.abilityTimer?.destroy()
    super.destroy(fromScene)
  }
}
