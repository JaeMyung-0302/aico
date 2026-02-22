/**
 * LOD (Level of Detail) 성능 최적화
 * FPS 모니터링 → 4단계 품질 다운그레이드
 */

import type { JuicyConfig, CombatEffectLevel, AtmosphereDetail } from './combat'

export type QualityLevel = 'full' | 'reduced' | 'minimal' | 'canvas'

interface LodState {
  fpsHistory: number[] // 게임 루프에서 성능상 mutable
  currentQuality: QualityLevel
  lastCheckTime: number
}

// FPS 샘플 수
const FPS_SAMPLE_COUNT = 60
// FPS 체크 간격 (ms)
const CHECK_INTERVAL = 3000
// 다운그레이드 임계값
const DOWNGRADE_FPS = 25
// 업그레이드 임계값
const UPGRADE_FPS = 45

// 품질 레벨 순서
const QUALITY_ORDER: readonly QualityLevel[] = ['full', 'reduced', 'minimal', 'canvas']

export const createLodState = (): LodState => ({
  fpsHistory: [],
  currentQuality: 'full',
  lastCheckTime: 0,
})

// FPS 샘플 기록 + 품질 레벨 조정
export const updateLod = (state: LodState, fps: number, time: number): QualityLevel => {
  state.fpsHistory.push(fps)
  if (state.fpsHistory.length > FPS_SAMPLE_COUNT) {
    state.fpsHistory = state.fpsHistory.slice(-FPS_SAMPLE_COUNT)
  }

  if (time - state.lastCheckTime < CHECK_INTERVAL) return state.currentQuality
  state.lastCheckTime = time

  if (state.fpsHistory.length < 10) return state.currentQuality

  const avgFps = state.fpsHistory.reduce((sum, f) => sum + f, 0) / state.fpsHistory.length
  const currentIdx = QUALITY_ORDER.indexOf(state.currentQuality)

  if (avgFps < DOWNGRADE_FPS && currentIdx < QUALITY_ORDER.length - 1) {
    state.currentQuality = QUALITY_ORDER[currentIdx + 1] as QualityLevel
  } else if (avgFps > UPGRADE_FPS && currentIdx > 0) {
    state.currentQuality = QUALITY_ORDER[currentIdx - 1] as QualityLevel
  }

  return state.currentQuality
}

// 시각 이펙트 LOD 헬퍼
const getAtmosphereDetail = (quality: QualityLevel): AtmosphereDetail =>
  quality === 'full' ? 'full' : 'simplified'

const getCombatEffectLevel = (quality: QualityLevel): CombatEffectLevel =>
  quality === 'full' || quality === 'reduced'
    ? 'enhanced'
    : quality === 'minimal'
      ? 'basic'
      : 'none'

// 품질 레벨별 설정
export const getLodConfig = (quality: QualityLevel): JuicyConfig => ({
  // 기존 플래그
  enableParticles: quality === 'full' || quality === 'reduced',
  enableScreenShake: quality === 'full',
  enableDamageNumbers: quality !== 'canvas',
  maxMonsters: quality === 'full' ? 30 : quality === 'reduced' ? 20 : 15,
  effectLayers: quality === 'full' ? 4 : quality === 'reduced' ? 2 : 1,
  deathParticles: quality === 'full' ? 12 : quality === 'reduced' ? 8 : quality === 'minimal' ? 4 : 0,
  enableEffectGlow: quality === 'full' || quality === 'reduced',
  enableHpBars: quality !== 'canvas',
  enableAttackAnim: quality === 'full' || quality === 'reduced',
  // 시각적 깊이 이펙트 플래그 (full: 전부, reduced: 섀도우+패럴랙스+분위기, minimal/canvas: 비활성)
  enableShadows: quality === 'full' || quality === 'reduced',
  enableParallax: quality === 'full' || quality === 'reduced',
  parallaxLayers: quality === 'full' ? 3 : quality === 'reduced' ? 2 : 0,
  enableAtmosphere: quality === 'full' || quality === 'reduced',
  atmosphereDetail: getAtmosphereDetail(quality),
  enableEnvironmentParticles: quality === 'full',
  enableEntityGlow: quality === 'full' || quality === 'reduced',
  enableBreathTween: quality === 'full',
  combatEffectLevel: getCombatEffectLevel(quality),
  // 조명 + 포스트프로세싱
  enableLighting: quality !== 'canvas',
  enableDynamicLights: quality === 'full' || quality === 'reduced',
  enableBloom: quality === 'full',
  enableChromaticAberration: quality === 'full' || quality === 'reduced',
  // 3D 모델 렌더링
  enable3DModels: quality !== 'canvas',
  enableLitMaterial: quality !== 'minimal' && quality !== 'canvas',
  enableCastShadow: quality === 'full',
  // 셀셰이딩 + 아웃라인 (full=cel+outline, reduced=cel only, minimal/canvas=lambert fallback)
  enableCelShading: quality === 'full' || quality === 'reduced',
  enableOutline: quality === 'full',
  celShadingSteps: quality === 'full' ? 2 : 1,
})
