/**
 * Audio Manager — Web Audio API 기반 사운드 매니저
 * 실제 오디오 파일은 Phase 2에서 추가 예정. 현재는 인터페이스만 정의.
 */

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

// 설정 변경
export const setAudioSettings = (settings: Partial<AudioState>): void => {
  audioState = { ...audioState, ...settings }
}

export const getAudioSettings = (): Readonly<AudioState> => audioState

// SFX 재생 (오디오 파일 준비 시 구현)
export const playSfx = (_type: SfxType): void => {
  if (!audioState.sfxEnabled) return
  // Phase 2: Phaser scene.sound.play(type, { volume: audioState.sfxVolume })
}

// BGM 시작/정지 (오디오 파일 준비 시 구현)
export const playBgm = (_key: string): void => {
  if (!audioState.bgmEnabled) return
  // Phase 2: scene.sound.play(key, { loop: true, volume: audioState.bgmVolume })
}

export const stopBgm = (): void => {
  // Phase 2: scene.sound.stopByKey(currentBgmKey)
}
