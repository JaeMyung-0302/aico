/**
 * LOD 품질 레벨 스토어
 * GameLoop가 FPS 기반으로 업데이트, GameCanvas가 구독
 */

import { create } from 'zustand'
import type { QualityLevel } from '../systems/lod'

interface LodStore {
  quality: QualityLevel
  setQuality: (quality: QualityLevel) => void
}

export const useLodStore = create<LodStore>((set) => ({
  quality: 'full',
  setQuality: (quality) =>
    set((state) => (state.quality === quality ? state : { quality })),
}))
