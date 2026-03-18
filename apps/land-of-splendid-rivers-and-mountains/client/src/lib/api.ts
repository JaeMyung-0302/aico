const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4003/api/v1'

const USER_ID_KEY = 'land-of-splendid-rivers-and-mountains:userId'

export const getUserId = (): string | null => localStorage.getItem(USER_ID_KEY)

export const setUserId = (id: string): void => {
  localStorage.setItem(USER_ID_KEY, id)
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const userId = getUserId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),

  putRaw: <T>(path: string, body: string) =>
    request<T>(path, { method: 'PUT', body }),

  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
