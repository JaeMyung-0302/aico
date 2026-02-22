import Phaser from 'phaser'

/**
 * 엔티티 라벨 시스템
 * 캐릭터/몬스터 위에 이름+레벨 텍스트 표시
 */

export interface EntityLabelConfig {
  readonly fontSize: number
  readonly color: string
  readonly yOffset: number
  readonly strokeColor?: string
  readonly strokeThickness?: number
}

const PLAYER_LABEL_CONFIG: EntityLabelConfig = {
  fontSize: 10,
  color: '#ffffff',
  yOffset: -28,
  strokeColor: '#000000',
  strokeThickness: 2,
}

const MONSTER_LABEL_CONFIG: EntityLabelConfig = {
  fontSize: 9,
  color: '#cccccc',
  yOffset: -4,
  strokeColor: '#000000',
  strokeThickness: 2,
}

const ELITE_LABEL_CONFIG: EntityLabelConfig = {
  fontSize: 9,
  color: '#ffcc00',
  yOffset: -6,
  strokeColor: '#000000',
  strokeThickness: 2,
}

export const createEntityLabel = (
  scene: Phaser.Scene,
  text: string,
  config: EntityLabelConfig,
): Phaser.GameObjects.Text => {
  const label = scene.add.text(0, 0, text, {
    fontSize: `${config.fontSize}px`,
    color: config.color,
    stroke: config.strokeColor,
    strokeThickness: config.strokeThickness ?? 0,
    fontFamily: 'monospace',
  })
  label.setOrigin(0.5, 1)
  label.setDepth(20)
  return label
}

export const updateEntityLabelPosition = (
  label: Phaser.GameObjects.Text,
  x: number,
  y: number,
  yOffset: number,
): void => {
  label.setPosition(x, y + yOffset)
}

export const createPlayerLabel = (scene: Phaser.Scene, name: string, level: number): Phaser.GameObjects.Text =>
  createEntityLabel(scene, `${name} Lv.${level}`, PLAYER_LABEL_CONFIG)

export const updatePlayerLabel = (label: Phaser.GameObjects.Text, name: string, level: number): void => {
  label.setText(`${name} Lv.${level}`)
}

export const syncPlayerLabel = (label: Phaser.GameObjects.Text, x: number, y: number): void => {
  updateEntityLabelPosition(label, x, y, PLAYER_LABEL_CONFIG.yOffset)
}

export const createMonsterLabel = (scene: Phaser.Scene, level: number): Phaser.GameObjects.Text =>
  createEntityLabel(scene, `Lv.${level}`, MONSTER_LABEL_CONFIG)

export const updateMonsterLabel = (label: Phaser.GameObjects.Text, level: number): void => {
  label.setText(`Lv.${level}`)
}

export const syncMonsterLabel = (label: Phaser.GameObjects.Text, x: number, y: number): void => {
  updateEntityLabelPosition(label, x, y, MONSTER_LABEL_CONFIG.yOffset)
}

export const createEliteLabel = (scene: Phaser.Scene, level: number): Phaser.GameObjects.Text =>
  createEntityLabel(scene, `Lv.${level}`, ELITE_LABEL_CONFIG)

export const updateEliteLabel = (label: Phaser.GameObjects.Text, level: number): void => {
  label.setText(`Lv.${level}`)
}

export const syncEliteLabel = (label: Phaser.GameObjects.Text, x: number, y: number): void => {
  updateEntityLabelPosition(label, x, y, ELITE_LABEL_CONFIG.yOffset)
}

export const destroyEntityLabel = (label: Phaser.GameObjects.Text | null): void => {
  if (label && label.scene) {
    label.destroy()
  }
}
