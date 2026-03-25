const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

export function api() {
  return {
    base,
    headers: { 'Content-Type': 'application/json' },
    async get<T>(path: string): Promise<T> {
      const r = await fetch(`${base}${path}`, { ...defaultOptions, headers: this.headers });
      if (!r.ok) throw new Error(await r.text());
      if (r.status === 204) return undefined as T;
      return r.json();
    },
    async post<T>(path: string, body?: unknown, init?: { signal?: AbortSignal }): Promise<T> {
      const r = await fetch(`${base}${path}`, {
        ...defaultOptions,
        method: 'POST',
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: init?.signal,
      });
      if (!r.ok) throw new Error(await r.text());
      if (r.status === 204) return undefined as T;
      return r.json();
    },
    async put<T>(path: string, body: unknown): Promise<T> {
      const r = await fetch(`${base}${path}`, {
        ...defaultOptions,
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async patch<T>(path: string, body: unknown): Promise<T> {
      const r = await fetch(`${base}${path}`, {
        ...defaultOptions,
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async delete(path: string): Promise<void> {
      const r = await fetch(`${base}${path}`, {
        ...defaultOptions,
        method: 'DELETE',
        headers: this.headers,
      });
      if (!r.ok) throw new Error(await r.text());
    },
  };
}
