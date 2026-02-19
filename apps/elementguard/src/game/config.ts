import Phaser from 'phaser'

export const createGameConfig = (
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: parent.clientWidth,
  height: parent.clientHeight,
  backgroundColor: '#1a1a2e',
  scene: scenes,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    touch: {
      capture: true,
    },
  },
})
