import { supabase } from './supabase'

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api${path}`, { headers })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `API error: ${res.status}`)
    }
    return res.json()
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? `API error: ${res.status}`)
    }
    return res.json()
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api${path}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? `API error: ${res.status}`)
    }
    return res.json()
  },

  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? `API error: ${res.status}`)
    }
    return res.json()
  },

  delete: async <T>(path: string): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api${path}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? `API error: ${res.status}`)
    }
    if (res.status === 204) return undefined as T
    return res.json()
  },
}
