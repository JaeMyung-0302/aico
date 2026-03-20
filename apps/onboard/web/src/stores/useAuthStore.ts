import { create } from 'zustand'
import api from '@/lib/api'
import { isAxiosError } from 'axios'

interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  role: string
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  isLoading: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const ensureTenant = async (): Promise<Tenant> => {
  const { data: tenants } = await api.get('/tenants')

  if (tenants.length > 0) {
    const tenant = tenants[0]
    localStorage.setItem('current_tenant_id', tenant.id)
    return tenant
  }

  const slug = `team-${Date.now()}`
  const { data: newTenant } = await api.post('/tenants', {
    name: 'My Team',
    slug,
  })
  localStorage.setItem('current_tenant_id', newTenant.id)
  return { id: newTenant.id, name: newTenant.name, slug: newTenant.slug, role: 'OWNER' }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const { data } = await api.get('/auth/me')
      const tenant = await ensureTenant()
      set({ user: data, tenant, isLoading: false })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('current_tenant_id')
      set({ user: null, tenant: null, isLoading: false })
    }
  },

  signUp: async (email, password, name) => {
    try {
      const { data } = await api.post('/auth/signup', { email, password, name })
      localStorage.setItem('access_token', data.token)
      const { data: user } = await api.get('/auth/me')
      const tenant = await ensureTenant()
      set({ user, tenant })
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.response?.data?.message || '회원가입에 실패했습니다.')
      }
      throw error
    }
  },

  signIn: async (email, password) => {
    try {
      const { data } = await api.post('/auth/signin', { email, password })
      localStorage.setItem('access_token', data.token)
      const { data: user } = await api.get('/auth/me')
      const tenant = await ensureTenant()
      set({ user, tenant })
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.response?.data?.message || '로그인에 실패했습니다.')
      }
      throw error
    }
  },

  signOut: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('current_tenant_id')
    set({ user: null, tenant: null })
  },
}))
