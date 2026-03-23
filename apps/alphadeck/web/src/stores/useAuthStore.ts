import { create } from 'zustand';
import api from '@/lib/api';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isLoading: false,

  signup: async (email, password) => {
    const { data } = await api.post('/auth/signup', { email, password });
    localStorage.setItem('access_token', data.token);
    set({ token: data.token, user: data.user });
  },

  signin: async (email, password) => {
    const { data } = await api.post('/auth/signin', { email, password });
    localStorage.setItem('access_token', data.token);
    set({ token: data.token, user: data.user });
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const { data } = await api.get('/auth/me');
      set({ user: data, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));
