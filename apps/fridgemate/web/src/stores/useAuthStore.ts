import { create } from 'zustand'
import { api, ApiRequestError } from '@/lib/api'
import type { AuthUser, AuthResponse, GroupCreateResponse } from '@/types'

const TOKEN_KEY = 'fridgemate-token'
const USER_KEY = 'fridgemate-user'
const GROUPNAME_KEY = 'fridgemate-group-name'

const loadUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

type JoinStatus = 'none' | 'pending' | 'approved' | 'rejected'

interface AuthState {
  token: string | null
  user: AuthUser | null
  groupName: string | null
  isAuthenticated: boolean
  needsGroup: boolean
  loading: boolean
  error: string | null
  joinRequestStatus: JoinStatus
  joinRequestGroupName: string | null
  isAdmin: boolean
  groupCode: string | null
}

interface AuthActions {
  register: (email: string, password: string, name: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  joinGroup: (code: string) => Promise<boolean>
  createGroup: (name: string) => Promise<boolean>
  checkJoinStatus: () => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
}

type AuthStore = AuthState & AuthActions

const initialToken = localStorage.getItem(TOKEN_KEY)
const initialUser = loadUser()
const initialGroupName = localStorage.getItem(GROUPNAME_KEY)

const STATUS_MAP: Record<string, JoinStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: initialToken,
  user: initialUser,
  groupName: initialGroupName,
  isAuthenticated: !!initialToken,
  needsGroup: !!initialToken && !initialUser?.groupId,
  loading: false,
  error: null,
  joinRequestStatus: 'none',
  joinRequestGroupName: null,
  isAdmin: false,
  groupCode: null,

  register: async (email, password, name) => {
    set({ loading: true, error: null })
    try {
      const data = await api.post<AuthResponse>('/auth/register', { email, password, name })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        needsGroup: !data.user.groupId,
        loading: false,
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다'
      set({ loading: false, error: message })
      return false
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const data = await api.post<AuthResponse>('/auth/login', { email, password })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        needsGroup: !data.user.groupId,
        loading: false,
        joinRequestStatus: 'none',
        joinRequestGroupName: null,
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다'
      set({ loading: false, error: message })
      return false
    }
  },

  joinGroup: async (code) => {
    set({ loading: true, error: null })
    try {
      await api.post<{ status: string; message: string; joinRequestId: string }>(
        '/auth/group/join',
        { code },
      )
      set({
        joinRequestStatus: 'pending',
        loading: false,
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '그룹 참여 요청에 실패했습니다'
      set({ loading: false, error: message })
      return false
    }
  },

  createGroup: async (name) => {
    set({ loading: true, error: null })
    try {
      const data = await api.post<GroupCreateResponse>('/auth/group/create', { name })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      localStorage.setItem(GROUPNAME_KEY, data.group.name)
      set({
        token: data.token,
        user: data.user,
        groupName: data.group.name,
        needsGroup: false,
        loading: false,
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '그룹 생성에 실패했습니다'
      set({ loading: false, error: message })
      return false
    }
  },

  checkJoinStatus: async () => {
    try {
      const data = await api.get<{ status: string; groupName?: string }>('/join-requests/my-status')
      set({
        joinRequestStatus: STATUS_MAP[data.status] ?? 'none',
        joinRequestGroupName: data.groupName ?? null,
      })
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        set({ joinRequestStatus: 'none', joinRequestGroupName: null })
      } else {
        set({ error: '상태 확인에 실패했습니다. 다시 시도해주세요.' })
      }
    }
  },

  fetchMe: async () => {
    try {
      const data = await api.get<{ user: AuthUser; isAdmin: boolean; groupName: string | null; groupCode: string | null }>('/auth/me')
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      if (data.groupName) localStorage.setItem(GROUPNAME_KEY, data.groupName)
      set({ user: data.user, isAdmin: data.isAdmin, groupName: data.groupName, groupCode: data.groupCode })
    } catch {
      // 인증 실패 시 무시
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(GROUPNAME_KEY)
    set({
      token: null,
      user: null,
      groupName: null,
      isAuthenticated: false,
      needsGroup: false,
      error: null,
      joinRequestStatus: 'none',
      joinRequestGroupName: null,
      isAdmin: false,
      groupCode: null,
    })
  },
}))
