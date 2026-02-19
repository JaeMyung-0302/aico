import Phaser from 'phaser'
import type { ElementEffect, ReactionType } from '@/types'

// 속성 효과별 스타일 설정
const EFFECT_STYLES: Record<ElementEffect, { color: string; fontSize: string; label: string }> = {
  effective: { color: '#ff8800', fontSize: '18px', label: '효과적!' },
  resisted: { color: '#888888', fontSize: '12px', label: '저항!' },
  immune: { color: '#ffffff', fontSize: '14px', label: '면역!' },
  neutral: { color: '#ffffff', fontSize: '14px', label: '' },
}

// 반응별 텍스트 색상
const REACTION_TEXT_COLORS: Record<ReactionType, string> = {
  steam: '#ccddff',
  firestorm: '#ff6600',
  overload: '#ff0044',
  magma: '#ff4400',
  blizzard: '#88ddff',
  electro: '#ffff00',
  swamp_reaction: '#448844',
  thunderstorm: '#ffff88',
  sandstorm: '#ddaa44',
  quake: '#886644',
}

export class DamageText extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    damage: number,
    elementEffect: ElementEffect,
  ) {
    const style = EFFECT_STYLES[elementEffect]
    const displayText = elementEffect === 'neutral'
      ? `${damage}`
      : elementEffect === 'immune'
        ? style.label
        : `${damage} ${style.label}`

    super(scene, x, y - 10, displayText, {
      fontSize: style.fontSize,
      color: style.color,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    })

    this.setOrigin(0.5, 1)
    scene.add.existing(this)

    // 위로 떠오르며 페이드아웃 (0.6초)
    scene.tweens.add({
      targets: this,
      y: y - 40,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    })
  }

  // 반응명 전용 텍스트 (크기 확대 + 반응 색상)
  static createReactionText(scene: Phaser.Scene, x: number, y: number, reactionName: string, reactionType: ReactionType): void {
    const color = REACTION_TEXT_COLORS[reactionType] ?? '#ffffff'
    const text = scene.add.text(x, y - 20, reactionName, {
      fontSize: '16px',
      color,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    text.setOrigin(0.5, 1)

    scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    })
  }
}
