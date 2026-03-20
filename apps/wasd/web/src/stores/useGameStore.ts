import { create } from 'zustand'
import type {
  Room,
  Player,
  Key,
  KeyAssignment,
  GamePhase,
  GameState,
  Direction,
  DeathEvent,
  RankingEntry,
} from '@wasd/shared'

interface GameResult {
  deaths: number
  elapsedTime: number
  ranking?: RankingEntry[]
  myRank?: number | null
}

const PREDICTION_GUARD_MS = 500

interface GameStore {
  roomCode: string | null
  players: Player[]
  myPlayerId: string | null
  myKeys: Key[]
  isHost: boolean
  gamePhase: GamePhase
  nickname: string
  gameState: GameState | null
  gameResult: GameResult | null
  predictionTime: number
  deathEvent: DeathEvent | null

  setNickname: (nickname: string) => void
  setMyPlayerId: (id: string) => void
  updateRoom: (room: Room) => void
  setMyKeys: (keys: Key[]) => void
  setGamePhase: (phase: GamePhase) => void
  setGameState: (state: GameState) => void
  applyPrediction: (direction: Direction) => void
  applyServerState: (state: GameState) => void
  applyGameStarted: (room: Room, assignments: KeyAssignment[]) => void
  setGameResult: (result: GameResult) => void
  setDeathEvent: (event: DeathEvent | null) => void
  reset: () => void
}

const initialState = {
  roomCode: null as string | null,
  players: [] as Player[],
  myPlayerId: null as string | null,
  myKeys: [] as Key[],
  isHost: false,
  gamePhase: 'lobby' as GamePhase,
  nickname: '',
  gameState: null as GameState | null,
  gameResult: null as GameResult | null,
  predictionTime: 0,
  deathEvent: null as DeathEvent | null,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setNickname: (nickname) => set({ nickname }),

  setMyPlayerId: (id) => set({ myPlayerId: id }),

  updateRoom: (room) => {
    const { myPlayerId } = get()
    const myPlayer = room.players.find((p) => p.id === myPlayerId)
    set({
      roomCode: room.code,
      players: room.players,
      isHost: room.hostId === myPlayerId,
      gamePhase: room.phase,
      myKeys: myPlayer?.keys ?? get().myKeys,
    })
  },

  setMyKeys: (keys) => set({ myKeys: keys }),

  setGamePhase: (phase) => set({ gamePhase: phase }),

  setGameState: (state) => set({ gameState: state, gamePhase: state.phase }),

  applyPrediction: (direction) => {
    const { gameState } = get()
    if (!gameState) return
    set({
      gameState: { ...gameState, direction, moving: true },
      predictionTime: Date.now(),
    })
  },

  applyServerState: (state) => {
    const { predictionTime, gameState: current } = get()
    const isPredictionActive = Date.now() - predictionTime < PREDICTION_GUARD_MS

    if (isPredictionActive && current) {
      set({
        gameState: {
          ...state,
          direction: current.direction,
          moving: current.moving,
        },
        gamePhase: state.phase,
      })
    } else {
      set({ gameState: state, gamePhase: state.phase })
    }
  },

  applyGameStarted: (room, assignments) => {
    const { myPlayerId, myKeys } = get()
    const myAssignment = assignments.find((a) => a.playerId === myPlayerId)
    set({
      roomCode: room.code,
      players: room.players,
      isHost: room.hostId === myPlayerId,
      gamePhase: room.phase,
      myKeys: myAssignment?.keys ?? myKeys,
    })
  },

  setGameResult: (result) => set({ gameResult: result, gamePhase: 'complete' }),

  setDeathEvent: (event) => set({ deathEvent: event }),

  reset: () => set(initialState),
}))
