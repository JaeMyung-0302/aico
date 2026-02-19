const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001'

const TOKEN_KEY = 'eg_access_token'
const REFRESH_KEY = 'eg_refresh_token'

export const getAccessToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY)

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

// Singleton promise로 동시 refresh 요청 방지 (token rotation race condition 방지)
let refreshPromise: Promise<boolean> | null = null

const refreshAccessToken = async (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false

      const data = await res.json()
      setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      return false
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (options.headers) {
    new Headers(options.headers).forEach((v, k) => headers.set(k, v))
  }

  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  // 401 → refresh 1회 재시도
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`)
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    } else {
      clearTokens()
    }
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
