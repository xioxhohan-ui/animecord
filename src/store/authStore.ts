import { create } from 'zustand';
import type { User } from '../types';

const API = '/api';
const getToken = () => localStorage.getItem('animecord_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
  'x-device-id': localStorage.getItem('animecord_device_id') || '',
});

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string | null;
  setDeviceId: (id: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  forceLogout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  fetchMe: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('animecord_token'),
  isAuthenticated: !!localStorage.getItem('animecord_token'),
  isLoading: true,
  deviceId: localStorage.getItem('animecord_device_id'),

  setDeviceId: (id) => {
    localStorage.setItem('animecord_device_id', id);
    set({ deviceId: id });
  },

  login: (token, user) => {
    localStorage.setItem('animecord_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await fetch(`${API}/logout`, { method: 'POST', headers: authHeaders() });
    } catch (e) {
      // ignore network errors on logout
    }
    localStorage.removeItem('animecord_token');
    sessionStorage.clear();
    // Dynamically import to avoid circular dependency
    import('./chatStore').then(m => m.useChatStore.getState().reset());
    set({ user: null, token: null, isAuthenticated: false });
  },

  forceLogout: () => {
    localStorage.clear();
    sessionStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
    // Force reload/redirect to login
    window.location.href = '/login';
  },

  updateProfile: async (updates) => {
    try {
      const res = await fetch(`${API}/updateProfile`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(updates),
      });
      if (res.ok) { const data = await res.json(); set({ user: data.user }); }
    } catch (e) { console.error('Profile update failed', e); }
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) { set({ isLoading: false }); return; }
    try {
      const res = await fetch(`${API}/me`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      } else { get().logout(); set({ isLoading: false }); }
    } catch { get().logout(); set({ isLoading: false }); }
  },

  refreshUser: async () => {
    try {
      const res = await fetch(`${API}/me`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); set({ user: data.user }); }
    } catch {}
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const res = await fetch(`${API}/password/change`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) return { success: true };
      return { success: false, error: data.error };
    } catch { return { success: false, error: 'Network error' }; }
  },
}));
