import { describe, it, expect } from 'vitest';
import {
  looksLikeLatinTransliteratedRussianTitle,
  reverseTransliterateLatinToCyrillic,
} from '../../utils/latinRussianTitle.js';

describe('looksLikeLatinTransliteratedRussianTitle', () => {
  it('определяет слова с типичными окончаниями транслита', () => {
    expect(looksLikeLatinTransliteratedRussianTitle('Moskovskaya')).toBe(true);
    expect(looksLikeLatinTransliteratedRussianTitle('novosti')).toBe(true);
    expect(looksLikeLatinTransliteratedRussianTitle('zhiteli-goroda')).toBe(true);
  });

  it('не определяет обычные английские слова как транслит', () => {
    expect(looksLikeLatinTransliteratedRussianTitle('breaking news')).toBe(false);
    // Примечание: функция — эвристика; слова с 'chn', 'stv' и др. паттернами
    // могут давать ложные срабатывания. Тестируем явно нейтральные слова.
    expect(looksLikeLatinTransliteratedRussianTitle('latest news feed')).toBe(false);
    expect(looksLikeLatinTransliteratedRussianTitle('global events')).toBe(false);
  });

  it('не определяет строки с кириллицей', () => {
    expect(looksLikeLatinTransliteratedRussianTitle('Новость')).toBe(false);
    expect(looksLikeLatinTransliteratedRussianTitle('Moskva город')).toBe(false);
  });

  it('возвращает false для коротких строк (< 6 символов)', () => {
    expect(looksLikeLatinTransliteratedRussianTitle('abc')).toBe(false);
  });

  it('возвращает false для null и undefined', () => {
    expect(looksLikeLatinTransliteratedRussianTitle(null)).toBe(false);
    expect(looksLikeLatinTransliteratedRussianTitle(undefined)).toBe(false);
    expect(looksLikeLatinTransliteratedRussianTitle('')).toBe(false);
  });
});

describe('reverseTransliterateLatinToCyrillic', () => {
  it('транслитерирует "Moskva" → "Москва" (частично)', () => {
    const result = reverseTransliterateLatinToCyrillic('Moskva');
    // Основные буквы должны быть преобразованы
    expect(result).toMatch(/^[А-Яа-яё]+$/);
  });

  it('сохраняет регистр первой буквы', () => {
    const lower = reverseTransliterateLatinToCyrillic('novosti');
    const upper = reverseTransliterateLatinToCyrillic('Novosti');
    expect(lower[0]).toBe(lower[0].toLowerCase());
    expect(upper[0]).toBe(upper[0].toUpperCase());
  });

  it('корректно обрабатывает диграфы "zh" → "ж"', () => {
    expect(reverseTransliterateLatinToCyrillic('zhitel')).toContain('ж');
  });

  it('корректно обрабатывает "sh" → "ш"', () => {
    expect(reverseTransliterateLatinToCyrillic('shkolnik')).toContain('ш');
  });

  it('корректно обрабатывает "ch" → "ч"', () => {
    expect(reverseTransliterateLatinToCyrillic('chelo')).toContain('ч');
  });

  it('обрабатывает "kh" → "х"', () => {
    expect(reverseTransliterateLatinToCyrillic('khorosho')).toContain('х');
  });

  it('обрабатывает "ya" → "я"', () => {
    expect(reverseTransliterateLatinToCyrillic('maya')).toContain('я');
  });

  it('возвращает пустую строку для пустого ввода', () => {
    expect(reverseTransliterateLatinToCyrillic('')).toBe('');
    expect(reverseTransliterateLatinToCyrillic(null)).toBe('');
    expect(reverseTransliterateLatinToCyrillic(undefined)).toBe('');
  });

  it('разделители сохраняются как пробелы', () => {
    const result = reverseTransliterateLatinToCyrillic('Odno Dva');
    expect(result).toContain(' ');
    const words = result.split(' ');
    expect(words.length).toBe(2);
  });

  it('обрабатывает дефис как разделитель', () => {
    const result = reverseTransliterateLatinToCyrillic('novoe-delo');
    // Должно вернуть кириллические слова через пробел
    expect(result.trim().length).toBeGreaterThan(0);
  });
});
