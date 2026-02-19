import Phaser from 'phaser'
import type { StageId } from '@soulblade/shared'
import { STAGE_BACKGROUNDS } from '../data/stages'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

// 스테이지 진입 시 로딩/전환 씬
// 타일맵 에셋 확보 후 이곳에서 lazy loading 추가 예정
export class StageLoadScene extends Phaser.Scene {
  private stageId: StageId = 'serpent_forest'

  constructor() {
    super({ key: 'StageLoadScene' })
  }

  init(data: { stageId: StageId }): void {
    this.stageId = data.stageId
  }

  create(): void {
    const bg = STAGE_BACKGROUNDS[this.stageId]
    this.cameras.main.setBackgroundColor(bg.color)

    // 스테이지명 표시
    const nameText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, bg.name, {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    nameText.setOrigin(0.5)

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '준비 중...', {
      fontSize: '18px',
      color: 'rgba(255,255,255,0.6)',
    })
    loadingText.setOrigin(0.5)

    // 1초 후 GameScene 전환
    this.time.delayedCall(1000, () => {
      this.scene.start('GameScene')
    })
  }
}
