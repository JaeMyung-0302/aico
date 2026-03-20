import type { Server, Socket } from 'socket.io'
import type { GamePhase, Room, Player, Key } from '@wasd/shared'
import { SocketEvents, MIN_PLAYERS, INVITE_CODE_LENGTH } from '@wasd/shared'
import { roomManager } from '../rooms/room-manager.js'
import { assignKeys } from '../rooms/key-assigner.js'
import { GameLoop, gameLoops } from '../engine/game-loop.js'
import { sanitizeNickname } from '../guards/rate-limiter.js'
import { logger } from '../lib/logger.js'

const validateNickname = (socket: Socket, nickname: string): string | null => {
  const trimmed = sanitizeNickname(nickname)
  if (!trimmed) {
    socket.emit(SocketEvents.ERROR, {
      message: '닉네임은 1~10자여야 합니다.',
    })
  }
  return trimmed
}

const applyKeyAssignments = (
  players: Player[],
  assignments: { playerId: string; keys: Key[] }[],
): Player[] => {
  return players.map((player) => {
    const assignment = assignments.find((a) => a.playerId === player.id)
    return { ...player, keys: assignment?.keys ?? [] }
  })
}

const stopGameLoop = (roomCode: string): void => {
  const loop = gameLoops.get(roomCode)
  if (loop) {
    loop.stop()
    gameLoops.delete(roomCode)
  }
}

const resetRoomPhase = (
  io: Server,
  room: Room,
  updatedRoom: Room | null,
): void => {
  if (!updatedRoom) return
  const resetRoom: Room =
    room.phase !== 'lobby'
      ? { ...updatedRoom, phase: 'lobby' as GamePhase }
      : updatedRoom
  if (resetRoom !== updatedRoom) {
    roomManager.updateRoom(room.code, resetRoom)
  }
  io.to(room.code).emit(SocketEvents.ROOM_UPDATED, resetRoom)
}

const cleanupExistingRoom = (socket: Socket, io: Server): void => {
  const existingRoom = roomManager.getRoomByPlayerId(socket.id)
  if (!existingRoom) return

  socket.leave(existingRoom.code)
  stopGameLoop(existingRoom.code)
  const updatedRoom = roomManager.leaveRoom(existingRoom.code, socket.id)
  if (updatedRoom) {
    io.to(existingRoom.code).emit(SocketEvents.ROOM_UPDATED, updatedRoom)
  }
}

export const registerRoomEvents = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Connected: ${socket.id}`)

    socket.on(
      SocketEvents.CREATE_ROOM,
      ({ nickname }: { nickname: string }) => {
        const trimmed = validateNickname(socket, nickname)
        if (!trimmed) return

        cleanupExistingRoom(socket, io)

        const room = roomManager.createRoom(socket.id, trimmed)
        if (!room) {
          socket.emit(SocketEvents.ERROR, {
            message: '서버 방 제한에 도달했습니다.',
          })
          return
        }
        socket.join(room.code)
        socket.emit(SocketEvents.ROOM_UPDATED, room)
      },
    )

    socket.on(
      SocketEvents.JOIN_ROOM,
      ({ code, nickname }: { code: string; nickname: string }) => {
        if (typeof code !== 'string' || code.length !== INVITE_CODE_LENGTH) {
          socket.emit(SocketEvents.ERROR, {
            message: '유효하지 않은 초대 코드입니다.',
          })
          return
        }
        const trimmed = validateNickname(socket, nickname)
        if (!trimmed) return

        cleanupExistingRoom(socket, io)

        const room = roomManager.joinRoom(code, socket.id, trimmed)
        if (!room) {
          socket.emit(SocketEvents.ERROR, {
            message: '방을 찾을 수 없거나 참가할 수 없습니다.',
          })
          return
        }
        socket.join(room.code)
        io.to(room.code).emit(SocketEvents.ROOM_UPDATED, room)
      },
    )

    socket.on(SocketEvents.LEAVE_ROOM, () => {
      const room = roomManager.getRoomByPlayerId(socket.id)
      if (!room) return
      socket.leave(room.code)
      stopGameLoop(room.code)
      const updatedRoom = roomManager.leaveRoom(room.code, socket.id)
      resetRoomPhase(io, room, updatedRoom)
    })

    socket.on(SocketEvents.SOLO_START, ({ nickname }: { nickname: string }) => {
      const trimmed = validateNickname(socket, nickname)
      if (!trimmed) return

      cleanupExistingRoom(socket, io)

      const room = roomManager.createRoom(socket.id, trimmed)
      if (!room) {
        socket.emit(SocketEvents.ERROR, {
          message: '서버 방 제한에 도달했습니다.',
        })
        return
      }
      socket.join(room.code)

      const assignments = assignKeys([socket.id])
      const updatedPlayers = applyKeyAssignments(room.players, assignments)

      const updatedRoom = {
        ...room,
        players: updatedPlayers,
        phase: 'playing' as GamePhase,
      }
      roomManager.updateRoom(room.code, updatedRoom)

      // 키 배정 개별 전송 (솔로는 단일 플레이어)
      const myAssignment = assignments.filter((a) => a.playerId === socket.id)
      socket.emit(SocketEvents.GAME_STARTED, {
        room: updatedRoom,
        assignments: myAssignment,
      })

      const gameLoop = new GameLoop(room.code, io, updatedRoom.players.length)
      gameLoops.set(room.code, gameLoop)
      gameLoop.start()
    })

    socket.on(SocketEvents.START_GAME, () => {
      const room = roomManager.getRoomByPlayerId(socket.id)
      if (!room) return
      if (room.hostId !== socket.id) return
      if (room.phase !== 'lobby') return
      if (room.players.length < MIN_PLAYERS) return

      const assignments = assignKeys(room.players.map((p) => p.id))
      const updatedPlayers = applyKeyAssignments(room.players, assignments)

      const updatedRoom = {
        ...room,
        players: updatedPlayers,
        phase: 'playing' as GamePhase,
      }
      roomManager.updateRoom(room.code, updatedRoom)

      // 키 배정 개별 전송: 각 플레이어에게 자신의 배정만 전달 (다른 플레이어 키 마스킹)
      for (const player of updatedRoom.players) {
        const myAssignment = assignments.filter((a) => a.playerId === player.id)
        const maskedRoom = {
          ...updatedRoom,
          players: updatedRoom.players.map((p) => ({
            ...p,
            keys: p.id === player.id ? p.keys : [],
          })),
        }
        io.to(player.id).emit(SocketEvents.GAME_STARTED, {
          room: maskedRoom,
          assignments: myAssignment,
        })
      }

      const gameLoop = new GameLoop(room.code, io, updatedRoom.players.length)
      gameLoops.set(room.code, gameLoop)
      gameLoop.start()
    })

    socket.on('disconnect', () => {
      logger.info(`Disconnected: ${socket.id}`)
      const room = roomManager.getRoomByPlayerId(socket.id)
      if (!room) return

      stopGameLoop(room.code)
      const updatedRoom = roomManager.leaveRoom(room.code, socket.id)
      resetRoomPhase(io, room, updatedRoom)
      if (updatedRoom) {
        io.to(room.code).emit(SocketEvents.PLAYER_DISCONNECTED, {
          playerId: socket.id,
        })
      }
    })
  })
}
