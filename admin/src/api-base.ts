/**
 * База для API-запросов админки.
 * Пустой / не заданный VITE_API_BASE_URL → относительные пути (/api/...) на текущем хосте
 * (nginx проксирует /api на backend с admin.ivanovo.online — без CORS).
 * Для локальной разработки задайте VITE_API_BASE_URL=http://localhost:3000 (или порт backend).
 */
export function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return String(raw).replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  return '';
}

/** Полный URL или путь для fetch (path с ведущим /). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const b = resolveApiBase();
  return b ? `${b}${p}` : p;
}
