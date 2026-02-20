/**
 * Audio Manager — Phaser Sound Manager 기반
 * initAudio(scene)으로 씬 참조 주입 후 playBgm/stopBgm 사용
 */

import Phaser from 'phaser'
import type { MapId } from '@soulblade/shared'

type SfxType = 'hit' | 'kill' | 'levelup' | 'death' | 'select'

interface AudioState {
  bgmEnabled: boolean
  sfxEnabled: boolean
  bgmVolume: number
  sfxVolume: number
}

let audioState: AudioState = {
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.3,
  sfxVolume: 0.5,
}

let currentScene: Phaser.Scene | null = null
let currentBgmKey: string | null = null

// BGM 오디오 키
export const BGM_KEYS: Partial<Record<MapId, string>> = {
  town: 'bgm_town',
} as const

// 씬 참조 주입 (GameScene.create에서 1회 호출)
export const initAudio = (scene: Phaser.Scene): void => {
  currentScene = scene
}

// 설정 변경
export const setAudioSettings = (settings: Partial<AudioState>): void => {
  audioState = { ...audioState, ...settings }
}

export const getAudioSettings = (): Readonly<AudioState> => audioState

// SFX 재생 (오디오 파일 준비 시 구현)
export const playSfx = (_type: SfxType): void => {
  if (!audioState.sfxEnabled) return
  // TODO: scene.sound.play(type, { volume: audioState.sfxVolume })
}

// BGM 재생 (loop) — Autoplay Policy 대응: sound.locked 시 unlock 후 재생
export const playBgm = (key: string): void => {
  if (!currentScene || !audioState.bgmEnabled) return
  if (currentBgmKey === key) return // 이미 재생 중
  stopBgm()
  currentBgmKey = key
  if (currentScene.sound.locked) {
    currentScene.sound.once('unlocked', () => {
      if (currentScene && currentBgmKey === key) {
        currentScene.sound.play(key, { loop: true, volume: audioState.bgmVolume })
      }
    })
  } else {
    currentScene.sound.play(key, { loop: true, volume: audioState.bgmVolume })
  }
}

// BGM 정지
export const stopBgm = (): void => {
  if (!currentScene || !currentBgmKey) return
  currentScene.sound.stopByKey(currentBgmKey)
  currentBgmKey = null
}
