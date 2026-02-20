import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string | undefined

export const socket: Socket = SOCKET_URL
  ? io(SOCKET_URL, { autoConnect: false, transports: ['websocket'] })
  : io({ autoConnect: false, transports: ['websocket'] })
