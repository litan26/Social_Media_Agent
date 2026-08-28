import { create } from 'zustand';
import { api } from '../services/api';
import type { User, AuthResponse, CreateUserPayload, RegisterPayload } from '../types/auth';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<User>;
  listUsers: () => Promise<User[]>;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/register', payload);
      localStorage.setItem('token', data.token);
      set({ token: data.token, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({
        token: data.token,
        user: {
          id: data.userId,
          email: data.email,
          role: data.role as any,
          plan: (data.plan || 'free') as any,
        },
        isLoading: false,
      });
      try {
        await get().fetchMe();
      } catch (meError) {
        console.warn('fetchMe after login fallback:', meError);
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchMe: async () => {
    const { data } = await api.get<User>('/api/auth/me');
    set({ user: data });
  },

  createUser: async (payload) => {
    const { data } = await api.post<User>('/api/admin/users', payload);
    return data;
  },

  listUsers: async () => {
    const { data } = await api.get<User[]>('/api/admin/users');
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('onboarding_complete');
    set({ token: null, user: null });
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
}));
