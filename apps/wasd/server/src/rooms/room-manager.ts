import type { Room, Player, GamePhase } from '@wasd/shared'
import { MAX_PLAYERS, MAX_ROOMS } from '@wasd/shared'
import { generateSecureCode } from '../guards/rate-limiter.js'

const rooms = new Map<string, Room>()

export const roomManager = {
  createRoom: (hostId: string, nickname: string): Room | null => {
    if (rooms.size >= MAX_ROOMS) return null
    const code = generateSecureCode(rooms)
    const host: Player = {
      id: hostId,
      nickname,
      keys: [],
      isHost: true,
    }
    const room: Room = {
      code,
      players: [host],
      hostId,
      phase: 'lobby' as GamePhase,
      stage: 1,
    }
    rooms.set(code, room)
    return room
  },

  joinRoom: (code: string, playerId: string, nickname: string): Room | null => {
    const room = rooms.get(code)
    if (!room) return null
    if (room.phase !== 'lobby') return null
    if (room.players.length >= MAX_PLAYERS) return null
    if (room.players.some((p) => p.id === playerId)) return null

    const player: Player = {
      id: playerId,
      nickname,
      keys: [],
      isHost: false,
    }
    const updatedRoom: Room = {
      ...room,
      players: [...room.players, player],
    }
    rooms.set(code, updatedRoom)
    return updatedRoom
  },

  leaveRoom: (code: string, playerId: string): Room | null => {
    const room = rooms.get(code)
    if (!room) return null

    const updatedPlayers = room.players.filter((p) => p.id !== playerId)

    if (updatedPlayers.length === 0) {
      rooms.delete(code)
      return null
    }

    const firstPlayer = updatedPlayers[0]
    if (!firstPlayer) {
      rooms.delete(code)
      return null
    }

    const newHostId = room.hostId === playerId ? firstPlayer.id : room.hostId
    const updatedRoom: Room = {
      ...room,
      players: updatedPlayers.map((p) => ({
        ...p,
        isHost: p.id === newHostId,
      })),
      hostId: newHostId,
    }
    rooms.set(code, updatedRoom)
    return updatedRoom
  },

  getRoom: (code: string): Room | undefined => rooms.get(code),

  updateRoom: (code: string, room: Room): void => {
    rooms.set(code, room)
  },

  getRoomByPlayerId: (playerId: string): Room | undefined => {
    for (const room of rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) {
        return room
      }
    }
    return undefined
  },
}
