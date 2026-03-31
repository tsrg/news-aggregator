import { defineStore } from 'pinia';
import { apiUrl } from '../api-base';

export interface User {
  id: string;
  email: string;
  role: string;
  roleId?: string;
  roleSlug?: string;
  isFullAccess?: boolean;
  permissions?: string[];
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    isFullAccess: (s) => s.user?.isFullAccess === true,
    hasPermission(): (code: string) => boolean {
      return (code: string) => {
        const u = this.user;
        if (!u) return false;
        if (u.isFullAccess === true) return true;
        if ((u.permissions || []).includes(code)) return true;
        if (u.role === 'ADMIN') return true;
        if (u.role === 'EDITOR' && code === 'news') return true;
        return false;
      };
    },
  },
  actions: {
    setAuth(user: User) {
      this.user = user;
    },
    async logout() {
      try {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          credentials: 'include',
        });
      } finally {
        this.user = null;
      }
    },
    async fetchMe(): Promise<void> {
      if (this.initialized) return;
      this.initialized = true;
      try {
        const r = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (r.ok) {
          const user = await r.json();
          this.user = user;
        } else {
          this.user = null;
        }
      } catch {
        this.user = null;
      }
    },
  },
});
