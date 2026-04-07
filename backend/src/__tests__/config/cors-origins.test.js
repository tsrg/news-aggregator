import { describe, it, expect, vi } from 'vitest';
import {
  normalizeOriginUrl,
  parseCorsOriginsEnv,
  toExpressCorsOrigin,
  toSocketIoCorsOrigin,
} from '../../config/cors-origins.js';

describe('normalizeOriginUrl', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeOriginUrl('https://EXAMPLE.COM')).toBe('https://example.com');
  });

  it('удаляет завершающий слеш', () => {
    expect(normalizeOriginUrl('https://example.com/')).toBe('https://example.com');
  });

  it('удаляет несколько завершающих слешей', () => {
    expect(normalizeOriginUrl('https://example.com///')).toBe('https://example.com');
  });

  it('удаляет оборачивающие двойные кавычки', () => {
    expect(normalizeOriginUrl('"https://example.com"')).toBe('https://example.com');
  });

  it('удаляет оборачивающие одинарные кавычки', () => {
    expect(normalizeOriginUrl("'https://example.com'")).toBe('https://example.com');
  });

  it('возвращает пустую строку для null', () => {
    expect(normalizeOriginUrl(null)).toBe('');
  });

  it('возвращает пустую строку для пустой строки', () => {
    expect(normalizeOriginUrl('')).toBe('');
  });

  it('обрабатывает строку с пробелами', () => {
    expect(normalizeOriginUrl('  https://example.com  ')).toBe('https://example.com');
  });
});

describe('parseCorsOriginsEnv', () => {
  it('возвращает null для пустой строки (разрешить все)', () => {
    expect(parseCorsOriginsEnv('')).toBeNull();
    expect(parseCorsOriginsEnv(undefined)).toBeNull();
  });

  it('парсит один origin', () => {
    expect(parseCorsOriginsEnv('https://example.com')).toEqual(['https://example.com']);
  });

  it('парсит несколько origins через запятую', () => {
    const result = parseCorsOriginsEnv('https://example.com,https://admin.example.com');
    expect(result).toContain('https://example.com');
    expect(result).toContain('https://admin.example.com');
    expect(result).toHaveLength(2);
  });

  it('нормализует origins (убирает кавычки и слеши)', () => {
    const result = parseCorsOriginsEnv('"https://example.com/",https://admin.example.com/');
    expect(result).toContain('https://example.com');
    expect(result).toContain('https://admin.example.com');
  });

  it('удаляет оборачивающие кавычки вокруг всей переменной', () => {
    const result = parseCorsOriginsEnv('"https://example.com,https://admin.example.com"');
    expect(result).toContain('https://example.com');
    expect(result).toContain('https://admin.example.com');
  });

  it('фильтрует пустые элементы', () => {
    const result = parseCorsOriginsEnv('https://example.com,,https://other.com');
    expect(result).toHaveLength(2);
  });
});

describe('toExpressCorsOrigin', () => {
  it('возвращает true (разрешить всё) если origins = null', () => {
    expect(toExpressCorsOrigin(null)).toBe(true);
  });

  it('возвращает функцию-проверку если origins задан', () => {
    const fn = toExpressCorsOrigin(['https://example.com']);
    expect(typeof fn).toBe('function');
  });

  it('разрешает origin из списка', () => {
    const fn = toExpressCorsOrigin(['https://example.com']);
    const cb = vi.fn();
    fn('https://example.com', cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('блокирует origin не из списка', () => {
    const fn = toExpressCorsOrigin(['https://example.com']);
    const cb = vi.fn();
    fn('https://evil.com', cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  it('разрешает запросы без origin (server-to-server)', () => {
    const fn = toExpressCorsOrigin(['https://example.com']);
    const cb = vi.fn();
    fn(undefined, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('нормализует origin перед сравнением (регистр и слеши)', () => {
    const fn = toExpressCorsOrigin(['https://example.com']);
    const cb = vi.fn();
    fn('https://EXAMPLE.COM/', cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });
});

describe('toSocketIoCorsOrigin', () => {
  it('возвращает true если origins = null', () => {
    expect(toSocketIoCorsOrigin(null)).toBe(true);
  });

  it('разрешает origin из списка', () => {
    const fn = toSocketIoCorsOrigin(['https://example.com']);
    const cb = vi.fn();
    fn('https://example.com', cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('блокирует неразрешённый origin', () => {
    const fn = toSocketIoCorsOrigin(['https://example.com']);
    const cb = vi.fn();
    fn('https://attacker.com', cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });
});
