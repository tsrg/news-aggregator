import { describe, it, expect } from 'vitest';
import {
  parseDateFromRssItem,
  parseSitemapLastmod,
} from '../../utils/sourcePublishedAt.js';

describe('parseDateFromRssItem', () => {
  it('парсит ISO-дату из isoDate', () => {
    const d = parseDateFromRssItem({ isoDate: '2024-01-15T12:00:00.000Z' });
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0); // январь
    expect(d.getUTCDate()).toBe(15);
  });

  it('парсит дату из pubDate', () => {
    const d = parseDateFromRssItem({ pubDate: 'Mon, 15 Jan 2024 12:00:00 GMT' });
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it('даёт приоритет isoDate над pubDate', () => {
    const d = parseDateFromRssItem({
      isoDate: '2024-06-01T00:00:00.000Z',
      pubDate: '2020-01-01T00:00:00.000Z',
    });
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it('пробует dcDate, если isoDate и pubDate отсутствуют', () => {
    const d = parseDateFromRssItem({ dcDate: '2024-03-10T08:30:00Z' });
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCMonth()).toBe(2); // март
  });

  it('возвращает null для пустого объекта', () => {
    expect(parseDateFromRssItem({})).toBeNull();
  });

  it('возвращает null для null/undefined', () => {
    expect(parseDateFromRssItem(null)).toBeNull();
    expect(parseDateFromRssItem(undefined)).toBeNull();
  });

  it('возвращает null для невалидной даты', () => {
    expect(parseDateFromRssItem({ isoDate: 'not-a-date' })).toBeNull();
  });

  it('игнорирует пустые строки', () => {
    expect(parseDateFromRssItem({ isoDate: '', pubDate: '' })).toBeNull();
  });
});

describe('parseSitemapLastmod', () => {
  it('парсит стандартный ISO формат', () => {
    const d = parseSitemapLastmod('2024-08-20T15:30:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it('парсит формат "YYYY-MM-DD HH:MM:SS" без таймзоны', () => {
    const d = parseSitemapLastmod('2024-08-20 15:30:00');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(7); // август
    expect(d.getDate()).toBe(20);
  });

  it('парсит формат "YYYY-MM-DD" (дата без времени)', () => {
    const d = parseSitemapLastmod('2024-12-25');
    expect(d).toBeInstanceOf(Date);
    // new Date('2024-12-25') парсится как UTC midnight — проверяем UTC-поля,
    // чтобы тест не зависел от часового пояса машины
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(11); // декабрь
    expect(d.getUTCDate()).toBe(25);
  });

  it('возвращает null для null', () => {
    expect(parseSitemapLastmod(null)).toBeNull();
  });

  it('возвращает null для undefined', () => {
    expect(parseSitemapLastmod(undefined)).toBeNull();
  });

  it('возвращает null для пустой строки', () => {
    expect(parseSitemapLastmod('')).toBeNull();
  });

  it('возвращает null для невалидной строки', () => {
    expect(parseSitemapLastmod('invalid date string')).toBeNull();
  });

  it('парсит дату с T-разделителем', () => {
    const d = parseSitemapLastmod('2024-05-10T00:00:00');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
  });
});
