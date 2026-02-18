import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${BASE_URL}${path}`, { headers })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  },

  delete: async <T>(path: string): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  },

  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  },
}
