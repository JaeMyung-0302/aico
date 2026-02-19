// 프로그래매틱 사운드 매니저 (Web Audio API)
// 외부 오디오 파일 없이 합성음으로 SFX 생성

type SoundType = 'summon' | 'merge' | 'fusion' | 'attack' | 'kill' | 'boss-appear' | 'wave-start' | 'wave-clear' | 'game-over' | 'game-clear'

let audioContext: AudioContext | null = null

const getAudioContext = (): AudioContext | null => {
  if (audioContext) return audioContext
  try {
    audioContext = new AudioContext()
    return audioContext
  } catch {
    return null
  }
}

// 간단한 톤 재생
const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) => {
  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// 연속 톤 (멜로디)
const playSequence = (notes: { freq: number; dur: number; delay: number }[], type: OscillatorType = 'sine', volume = 0.12) => {
  for (const note of notes) {
    setTimeout(() => playTone(note.freq, note.dur, type, volume), note.delay * 1000)
  }
}

// 진동 피드백
const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// SFX 정의
const SOUND_EFFECTS: Record<SoundType, () => void> = {
  summon: () => {
    playTone(440, 0.1, 'sine', 0.1)
    setTimeout(() => playTone(660, 0.15, 'sine', 0.1), 80)
    vibrate(30)
  },

  merge: () => {
    playSequence([
      { freq: 330, dur: 0.08, delay: 0 },
      { freq: 440, dur: 0.08, delay: 0.06 },
      { freq: 660, dur: 0.15, delay: 0.12 },
    ], 'triangle')
    vibrate([20, 30, 40])
  },

  fusion: () => {
    playSequence([
      { freq: 220, dur: 0.15, delay: 0 },
      { freq: 330, dur: 0.15, delay: 0.1 },
      { freq: 440, dur: 0.15, delay: 0.2 },
      { freq: 660, dur: 0.2, delay: 0.3 },
      { freq: 880, dur: 0.3, delay: 0.4 },
    ], 'sine', 0.15)
    vibrate([30, 50, 30, 50, 60])
  },

  attack: () => {
    playTone(200, 0.05, 'square', 0.05)
  },

  kill: () => {
    playTone(180, 0.08, 'sawtooth', 0.06)
    setTimeout(() => playTone(120, 0.12, 'sawtooth', 0.04), 60)
  },

  'boss-appear': () => {
    playSequence([
      { freq: 100, dur: 0.3, delay: 0 },
      { freq: 80, dur: 0.3, delay: 0.2 },
      { freq: 60, dur: 0.5, delay: 0.4 },
    ], 'sawtooth', 0.2)
    vibrate([100, 50, 100, 50, 200])
  },

  'wave-start': () => {
    playSequence([
      { freq: 440, dur: 0.1, delay: 0 },
      { freq: 550, dur: 0.1, delay: 0.1 },
      { freq: 660, dur: 0.15, delay: 0.2 },
    ], 'triangle', 0.1)
    vibrate(50)
  },

  'wave-clear': () => {
    playSequence([
      { freq: 523, dur: 0.1, delay: 0 },
      { freq: 659, dur: 0.1, delay: 0.1 },
      { freq: 784, dur: 0.15, delay: 0.2 },
      { freq: 1047, dur: 0.25, delay: 0.35 },
    ], 'sine', 0.12)
    vibrate([30, 30, 50])
  },

  'game-over': () => {
    playSequence([
      { freq: 440, dur: 0.2, delay: 0 },
      { freq: 370, dur: 0.2, delay: 0.2 },
      { freq: 330, dur: 0.2, delay: 0.4 },
      { freq: 262, dur: 0.5, delay: 0.6 },
    ], 'sine', 0.15)
    vibrate([100, 50, 200])
  },

  'game-clear': () => {
    playSequence([
      { freq: 523, dur: 0.1, delay: 0 },
      { freq: 659, dur: 0.1, delay: 0.1 },
      { freq: 784, dur: 0.1, delay: 0.2 },
      { freq: 1047, dur: 0.15, delay: 0.3 },
      { freq: 1319, dur: 0.2, delay: 0.45 },
      { freq: 1568, dur: 0.4, delay: 0.6 },
    ], 'sine', 0.15)
    vibrate([50, 30, 50, 30, 100])
  },
}

let isMuted = false

export const SoundManager = {
  play: (type: SoundType) => {
    if (isMuted) return
    const effect = SOUND_EFFECTS[type]
    effect()
  },

  setMuted: (muted: boolean) => {
    isMuted = muted
  },

  isMuted: () => isMuted,

  // AudioContext 초기화 (유저 제스처 필요)
  resume: () => {
    const ctx = getAudioContext()
    if (ctx?.state === 'suspended') {
      ctx.resume()
    }
  },

  // AudioContext 종료 (씬 shutdown 또는 앱 언마운트 시 호출)
  close: () => {
    audioContext?.close()
    audioContext = null
  },
}
