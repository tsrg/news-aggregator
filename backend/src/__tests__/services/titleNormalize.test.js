import { describe, it, expect } from 'vitest';
import { normalizeTitleForIndex } from '../../services/titleNormalize.js';

describe('normalizeTitleForIndex', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeTitleForIndex('Большой Заголовок')).toBe('большой заголовок');
  });

  it('удаляет типографские кавычки', () => {
    const result = normalizeTitleForIndex('«Тест» и "другой" и „третий"');
    expect(result).not.toContain('«');
    expect(result).not.toContain('»');
    expect(result).not.toContain('"');
    expect(result).not.toContain('„');
  });

  it('удаляет спецсимволы, оставляет буквы и цифры', () => {
    const result = normalizeTitleForIndex('Заголовок! С? Пунктуацией: (и скобками)');
    expect(result).not.toContain('!');
    expect(result).not.toContain('?');
    expect(result).not.toContain(':');
    expect(result).not.toContain('(');
    expect(result).toContain('заголовок');
  });

  it('сжимает множественные пробелы в один', () => {
    const result = normalizeTitleForIndex('Слово   Другое    Третье');
    expect(result).toBe('слово другое третье');
  });

  it('убирает начальные и конечные пробелы', () => {
    expect(normalizeTitleForIndex('  Заголовок  ')).toBe('заголовок');
  });

  it('обрабатывает пустую строку', () => {
    expect(normalizeTitleForIndex('')).toBe('');
  });

  it('обрабатывает null и undefined', () => {
    expect(normalizeTitleForIndex(null)).toBe('');
    expect(normalizeTitleForIndex(undefined)).toBe('');
  });

  it('сохраняет цифры', () => {
    const result = normalizeTitleForIndex('В 2024 году произошло 5 событий');
    expect(result).toContain('2024');
    expect(result).toContain('5');
  });

  it('сохраняет кириллические буквы', () => {
    const result = normalizeTitleForIndex('Москва Петербург Екатеринбург');
    expect(result).toContain('москва');
    expect(result).toContain('петербург');
  });

  it('удаляет многоточие', () => {
    const result = normalizeTitleForIndex('Заголовок…');
    expect(result).not.toContain('…');
  });

  it('одинаково нормализует похожие заголовки', () => {
    const a = normalizeTitleForIndex('«Губернатор» посетил завод');
    const b = normalizeTitleForIndex('Губернатор посетил завод');
    // Оба должны нормализоваться к одному результату
    expect(a).toBe(b);
  });
});
