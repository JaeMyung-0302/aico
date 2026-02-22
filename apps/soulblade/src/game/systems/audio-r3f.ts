/**
 * Howler.js 기반 오디오 시스템
 * Phaser Sound Manager 대체
 *
 * 동일 API: initAudio(), playBgm(), stopBgm(), playSfx()
 */

import { Howl } from 'howler'
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

let currentBgmKey: string | null = null
let currentBgm: Howl | null = null

// 맵별 BGM 오디오 파일 경로
const BGM_PATHS: Partial<Record<MapId, string>> = {
  town: '/assets/village.mp3',
} as const

// R3F에서는 씬 참조 불필요 — Howler가 자체 AudioContext 관리
export const initAudioR3F = (): void => {
  // Howler는 자동으로 AudioContext를 관리하므로 초기화 불필요
  // 브라우저 autoplay policy는 Howler가 자동 처리
}

export const setAudioSettings = (settings: Partial<AudioState>): void => {
  audioState = { ...audioState, ...settings }
  if (currentBgm) {
    currentBgm.volume(audioState.bgmVolume)
  }
}

export const getAudioSettings = (): Readonly<AudioState> => audioState

export const playSfx = (_type: SfxType): void => {
  if (!audioState.sfxEnabled) return
  // TODO: SFX 파일 준비 시 구현
}

export const playBgmR3F = (mapId: MapId): void => {
  if (!audioState.bgmEnabled) return

  const path = BGM_PATHS[mapId]
  if (!path) return
  if (currentBgmKey === mapId && currentBgm) return // 이미 재생 중

  stopBgmR3F()
  currentBgmKey = mapId

  currentBgm = new Howl({
    src: [path],
    loop: true,
    volume: audioState.bgmVolume,
    html5: true, // 모바일 호환성 + 스트리밍
  })

  currentBgm.play()
}

export const stopBgmR3F = (): void => {
  if (currentBgm) {
    currentBgm.stop()
    currentBgm.unload()
    currentBgm = null
  }
  currentBgmKey = null
}
