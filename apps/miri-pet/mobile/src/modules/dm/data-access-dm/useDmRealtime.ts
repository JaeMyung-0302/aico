import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { requestApi } from '@/shared/api/api-client'
import { tokenStore } from '@/shared/api/token-store'
import { API_BASE_URL } from '@/shared/config/api-base-url'
import { bindDmReconnect, bindDmSocketEvents, connectDmSocket, socketOrigin } from '../util-socket/socket'

const RETRY_BASE_MS = 5_000
const RETRY_MAX_MS = 60_000

const readAccessToken = async (): Promise<string | null> => (await tokenStore.read())?.accessToken ?? null

// 로그인한 탭 영역에서 한 번만 연결한다. handshake 거부(대개 access token 만료)와 서버가 끊은 연결(토큰 만료 시각·로그아웃)은
// 자동 재연결되지 않으므로 REST 호출 1번으로 토큰을 갱신(axios 인터셉터)한 뒤 점점 늦게 다시 연결한다. 로그아웃이면 토큰이 없어 멈춘다
export const useDmRealtime = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = connectDmSocket({
      io: (origin, options) => io(origin, options),
      origin: socketOrigin(API_BASE_URL),
      getAccessToken: readAccessToken,
    })
    bindDmSocketEvents(socket, queryClient)
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = RETRY_BASE_MS

    const scheduleRetry = async () => {
      if (retryTimer || !(await readAccessToken())) return
      await requestApi({ method: 'GET', url: '/me' }).catch(() => undefined)
      retryTimer = setTimeout(() => {
        retryTimer = null
        socket.connect()
      }, retryDelay)
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
    }
    socket.on('connect', () => {
      retryDelay = RETRY_BASE_MS
    })
    bindDmReconnect(socket, () => {
      scheduleRetry().catch(() => undefined)
    })

    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      socket.disconnect()
    }
  }, [queryClient])
}
