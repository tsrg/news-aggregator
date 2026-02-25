import { defineStore } from 'pinia';

export interface User {
  id: string;
  email: string;
  role: 'EDITOR' | 'ADMIN';
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
    isAdmin: (s) => s.user?.role === 'ADMIN',
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
