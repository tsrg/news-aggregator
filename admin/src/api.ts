const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function api() {
  const token = localStorage.getItem('admin_token');
  return {
    base,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    async get<T>(path: string): Promise<T> {
      const r = await fetch(`${base}${path}`, { headers: this.headers });
      if (!r.ok) throw new Error(await r.text());
      if (r.status === 204) return undefined as T;
      return r.json();
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      const r = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new Error(await r.text());
      if (r.status === 204) return undefined as T;
      return r.json();
    },
    async put<T>(path: string, body: unknown): Promise<T> {
      const r = await fetch(`${base}${path}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async patch<T>(path: string, body: unknown): Promise<T> {
      const r = await fetch(`${base}${path}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async delete(path: string): Promise<void> {
      const r = await fetch(`${base}${path}`, { method: 'DELETE', headers: this.headers });
      if (!r.ok) throw new Error(await r.text());
    },
  };
}
