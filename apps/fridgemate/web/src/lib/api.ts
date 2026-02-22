// fetch 기반 API client
// JWT Bearer token으로 인증

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const getToken = (): string | null => {
  return localStorage.getItem('fridgemate-token')
}

interface ApiError {
  message?: string
  error?: string
  status?: number
}

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    // 401 응답 시 세션 정리 + 로그인 페이지로 리다이렉트
    if (response.status === 401 && !response.url.includes('/auth/')) {
      localStorage.removeItem('fridgemate-token')
      localStorage.removeItem('fridgemate-user')
      localStorage.removeItem('fridgemate-group-name')
      window.location.href = '/login'
      return new Promise<T>(() => {})
    }

    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = (await response.json()) as ApiError
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new ApiRequestError(errorMessage, response.status)
  }

  // 204 No Content 처리
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(),
    })
    return handleResponse<T>(response)
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  delete: async <T>(path: string): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    })
    return handleResponse<T>(response)
  },
}
