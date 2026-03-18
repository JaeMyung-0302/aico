import type Phaser from 'phaser'
import type { IGameSystem } from './system-manager'
import { eventBus } from '@/lib/event-bus'

const SCENE_BGM: Readonly<Record<string, string>> = {
  FarmScene: 'bgm-farm',
  VillageScene: 'bgm-village',
  DungeonScene: 'bgm-dungeon',
  RiverScene: 'bgm-river',
  BeachScene: 'bgm-river',
  MarketScene: 'bgm-village',
  TempleScene: 'bgm-village',
}

const EVENT_SFX: Readonly<Record<string, string>> = {
  'farm:planted': 'sfx-plant',
  'farm:harvested': 'sfx-harvest',
  'farm:watered': 'sfx-water',
  'combat:hit': 'sfx-hit',
  'gold:changed': 'sfx-coin',
  'fishing:bite': 'sfx-fish-bite',
  'fishing:caught': 'sfx-fish-catch',
  'quest:accepted': 'sfx-quest',
  'quest:completed': 'sfx-quest',
}

export class AudioSystem implements IGameSystem {
  readonly id = 'audio'
  private scene: Phaser.Scene | null = null
  private currentBgmKey: string | null = null
  private bgmVolume = 0.4
  private sfxVolume = 0.6
  private readonly sfxHandlers: Array<[string, () => void]> = []

  private onTransition = ({ to }: { from: string; to: string }) => {
    const bgmKey = SCENE_BGM[to] ?? null
    this.playBgm(bgmKey)
  }

  init(scene: Phaser.Scene): void {
    this.scene = scene

    eventBus.on('scene:transition', this.onTransition)

    for (const [event, sfxKey] of Object.entries(EVENT_SFX)) {
      const handler = () => this.playSfx(sfxKey)
      this.sfxHandlers.push([event, handler])
      eventBus.on(event as never, handler)
    }

    const initialBgm = SCENE_BGM[scene.scene.key] ?? null
    this.playBgm(initialBgm)
  }

  update(): void {
    // Audio system is event-driven, no per-frame updates needed
  }

  destroy(): void {
    eventBus.off('scene:transition', this.onTransition)
    for (const [event, handler] of this.sfxHandlers) {
      eventBus.off(event as never, handler)
    }
    this.sfxHandlers.length = 0
    this.stopBgm()
    this.scene = null
  }

  private playBgm(key: string | null): void {
    if (key === this.currentBgmKey) return
    this.stopBgm()
    if (!key || !this.scene) return
    if (!this.scene.cache.audio.exists(key)) return

    this.scene.sound.play(key, { loop: true, volume: this.bgmVolume })
    this.currentBgmKey = key
  }

  private stopBgm(): void {
    if (!this.currentBgmKey || !this.scene) return
    this.scene.sound.stopByKey(this.currentBgmKey)
    this.currentBgmKey = null
  }

  private playSfx(key: string): void {
    if (!this.scene) return
    if (!this.scene.cache.audio.exists(key)) return
    this.scene.sound.play(key, { volume: this.sfxVolume })
  }
}
