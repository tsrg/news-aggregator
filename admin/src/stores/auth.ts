import { defineStore } from 'pinia';

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
  state: () => {
    const token = localStorage.getItem('admin_token');
    let user: User | null = null;
    try {
      const u = localStorage.getItem('admin_user');
      if (u) user = JSON.parse(u) as User;
    } catch {}
    return { token, user };
  },
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isFullAccess: (s) => s.user?.isFullAccess === true,
    hasPermission(): (code: string) => boolean {
      return (code: string) => {
        const u = this.user;
        if (!u) return false;
        if (u.isFullAccess === true) return true;
        if ((u.permissions || []).includes(code)) return true;
        // Обратная совместимость: старый формат ответа API (только role без permissions)
        if (u.role === 'ADMIN') return true;
        if (u.role === 'EDITOR' && code === 'news') return true;
        return false;
      };
    },
  },
  actions: {
    setAuth(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    },
    async fetchUser() {
      if (!this.token) return;
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const r = await fetch(`${base}/api/admin/news?limit=1`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (r.ok && this.user) return;
        if (!r.ok) this.logout();
      } catch {
        this.logout();
      }
    },
  },
});
