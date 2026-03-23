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
  tenants: Tenant[]
  isLoading: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  fetchTenants: () => Promise<Tenant[]>
  setTenant: (tenant: Tenant) => void
  createTenant: (name: string, slug: string) => Promise<Tenant>
}

const restoreTenant = (tenants: Tenant[]): Tenant | null => {
  if (tenants.length === 0) return null

  const savedId = localStorage.getItem('current_tenant_id')
  const saved = tenants.find((t) => t.id === savedId)
  if (saved) return saved

  const first = tenants.at(0)
  if (!first) return null
  localStorage.setItem('current_tenant_id', first.id)
  return first
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  tenants: [],
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const { data: user } = await api.get('/auth/me')
      const { data: tenants } = await api.get('/tenants')
      const tenant = restoreTenant(tenants)
      set({ user, tenants, tenant, isLoading: false })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('current_tenant_id')
      set({ user: null, tenant: null, tenants: [], isLoading: false })
    }
  },

  signUp: async (email, password, name) => {
    try {
      const { data } = await api.post('/auth/signup', { email, password, name })
      localStorage.setItem('access_token', data.token)
      const { data: user } = await api.get('/auth/me')
      const { data: tenants } = await api.get('/tenants')
      const tenant = restoreTenant(tenants)
      set({ user, tenants, tenant })
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
      const { data: tenants } = await api.get('/tenants')
      const tenant = restoreTenant(tenants)
      set({ user, tenants, tenant })
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
    set({ user: null, tenant: null, tenants: [] })
  },

  fetchTenants: async () => {
    try {
      const { data: tenants } = await api.get('/tenants')
      set({ tenants })
      return tenants
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.response?.data?.message || '팀 목록을 불러오지 못했습니다.')
      }
      throw error
    }
  },

  setTenant: (tenant) => {
    localStorage.setItem('current_tenant_id', tenant.id)
    set({ tenant })
  },

  createTenant: async (name, slug) => {
    try {
      const { data: newTenant } = await api.post('/tenants', { name, slug })
      const tenant: Tenant = {
        id: newTenant.id,
        name: newTenant.name,
        slug: newTenant.slug,
        role: 'OWNER',
      }
      const { tenants } = get()
      localStorage.setItem('current_tenant_id', tenant.id)
      set({ tenants: [...tenants, tenant], tenant })
      return tenant
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.response?.data?.message || '팀 생성에 실패했습니다.')
      }
      throw error
    }
  },
}))
