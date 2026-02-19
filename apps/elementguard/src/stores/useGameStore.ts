import { create } from 'zustand'

interface GameState {
  wave: number
  gold: number
  hp: number
  maxHp: number
  score: number
  unitCount: number
  isWaveActive: boolean
  artifacts: string[]
  isGameOver: boolean
  isGameClear: boolean
}

interface GameActions {
  updateFromPhaser: (partial: Partial<GameState>) => void
  addArtifact: (artifactId: string) => void
  setGameOver: () => void
  setGameClear: () => void
  reset: () => void
}

const initialState: GameState = {
  wave: 0,
  gold: 30,
  hp: 100,
  maxHp: 100,
  score: 0,
  unitCount: 0,
  isWaveActive: false,
  artifacts: [],
  isGameOver: false,
  isGameClear: false,
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,
  updateFromPhaser: (partial) => set(partial),
  addArtifact: (artifactId) =>
    set((state) => ({ artifacts: [...state.artifacts, artifactId] })),
  setGameOver: () => set({ isGameOver: true }),
  setGameClear: () => set({ isGameClear: true }),
  reset: () => set(initialState),
}))
