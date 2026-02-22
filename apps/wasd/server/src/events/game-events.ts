import type { Server, Socket } from 'socket.io'
import type { Key } from '@wasd/shared'
import { SocketEvents } from '@wasd/shared'
import { roomManager } from '../rooms/room-manager.js'
import { gameLoops } from '../engine/game-loop.js'
import { rankingStore } from '../engine/ranking-store.js'

const VALID_KEYS = new Set<Key>(['w', 'a', 's', 'd'])

export const registerGameEvents = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    socket.on(SocketEvents.INPUT, ({ key }: { key: Key }) => {
      if (!VALID_KEYS.has(key)) return

      const room = roomManager.getRoomByPlayerId(socket.id)
      if (!room) return

      const player = room.players.find((p) => p.id === socket.id)
      if (!player || !player.keys.includes(key)) return

      const gameLoop = gameLoops.get(room.code)
      if (!gameLoop) return

      gameLoop.queueInput({
        key,
        playerId: socket.id,
        nickname: player.nickname,
      })
    })

    socket.on(SocketEvents.RANKING_FETCH, () => {
      socket.emit(SocketEvents.RANKING_DATA, {
        ranking: rankingStore.getRankings(),
      })
    })
  })
}
