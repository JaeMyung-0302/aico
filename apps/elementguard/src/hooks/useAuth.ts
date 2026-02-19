import { useEffect, useCallback, useState, useRef } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { getProfile, upsertProfile } from '@/lib/api'
import { apiFetch, setTokens, clearTokens, getAccessToken } from '@/lib/api-client'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001'

export const useAuth = () => {
  const { userId, setUser, reset } = useUserStore()
  const [isLoading, setIsLoading] = useState(true)
  const guestAttempted = useRef(false)

  const loadUserProfile = useCallback(async (isGuestHint?: boolean) => {
    const profile = await getProfile()
    if (profile) {
      setUser(profile.id, profile.display_name, profile.is_guest, profile.gel, profile.exp, profile.level)
    } else {
      const isGuest = isGuestHint ?? false
      const displayName = isGuest ? 'Guest' : 'Player'
      await upsertProfile({ display_name: displayName })
      const newProfile = await getProfile()
      if (newProfile) {
        setUser(newProfile.id, newProfile.display_name, newProfile.is_guest, newProfile.gel, newProfile.exp, newProfile.level)
      }
    }
  }, [setUser])

  // 세션 초기화 — localStorage에 토큰이 있으면 프로필 로드
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      try {
        const token = getAccessToken()
        if (token) {
          await loadUserProfile()
        }
      } catch {
        clearTokens()
      }
      setIsLoading(false)
    }

    initAuth()
  }, [loadUserProfile])

  // 이메일 회원가입
  const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return false

      const tokens: TokenPair = await res.json()
      setTokens(tokens.accessToken, tokens.refreshToken)
      await loadUserProfile(false)
      return true
    } catch {
      return false
    }
  }, [loadUserProfile])

  // 이메일 로그인
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return false

      const tokens: TokenPair = await res.json()
      setTokens(tokens.accessToken, tokens.refreshToken)
      await loadUserProfile(false)
      return true
    } catch {
      return false
    }
  }, [loadUserProfile])

  // 게스트 로그인
  const signInAsGuest = useCallback(async (): Promise<boolean> => {
    if (guestAttempted.current) return false
    guestAttempted.current = true

    try {
      const tokens = await apiFetch<TokenPair>('/auth/guest', { method: 'POST' })
      setTokens(tokens.accessToken, tokens.refreshToken)
      await loadUserProfile(true)
      return true
    } catch {
      guestAttempted.current = false
      return false
    }
  }, [loadUserProfile])

  // 로그아웃
  const signOut = useCallback(async () => {
    guestAttempted.current = false
    clearTokens()
    reset()
  }, [reset])

  return {
    userId,
    isLoading,
    isAuthenticated: userId !== null,
    signUp,
    signIn,
    signInAsGuest,
    signOut,
  }
}
