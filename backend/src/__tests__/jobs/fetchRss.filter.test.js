import { describe, it, expect } from 'vitest';
import { matchesFilter, shouldIncludeItem } from '../../jobs/fetchRss.js';

describe('matchesFilter', () => {
  describe('оператор contains', () => {
    it('возвращает true если значение содержит подстроку', () => {
      expect(matchesFilter('Новость о спорте', 'contains', 'спорт')).toBe(true);
    });

    it('нечувствителен к регистру', () => {
      expect(matchesFilter('СПОРТ', 'contains', 'спорт')).toBe(true);
    });

    it('возвращает false если подстрока не найдена', () => {
      expect(matchesFilter('Новость о спорте', 'contains', 'политика')).toBe(false);
    });

    it('возвращает false для пустого значения', () => {
      expect(matchesFilter('', 'contains', 'слово')).toBe(false);
      expect(matchesFilter(null, 'contains', 'слово')).toBe(false);
    });
  });

  describe('оператор not_contains', () => {
    it('возвращает true если подстрока НЕ найдена', () => {
      expect(matchesFilter('Новость о спорте', 'not_contains', 'политика')).toBe(true);
    });

    it('возвращает false если подстрока найдена', () => {
      expect(matchesFilter('Новость о спорте', 'not_contains', 'спорт')).toBe(false);
    });
  });

  describe('оператор equals', () => {
    it('возвращает true при полном совпадении', () => {
      expect(matchesFilter('спорт', 'equals', 'спорт')).toBe(true);
    });

    it('нечувствителен к регистру', () => {
      expect(matchesFilter('СПОРТ', 'equals', 'спорт')).toBe(true);
    });

    it('возвращает false при частичном совпадении', () => {
      expect(matchesFilter('Новость о спорте', 'equals', 'спорт')).toBe(false);
    });
  });

  describe('оператор starts_with', () => {
    it('возвращает true если строка начинается с паттерна', () => {
      expect(matchesFilter('Спорт: главные новости', 'starts_with', 'спорт')).toBe(true);
    });

    it('возвращает false если строка не начинается с паттерна', () => {
      expect(matchesFilter('Главные новости спорта', 'starts_with', 'спорт')).toBe(false);
    });
  });

  describe('оператор ends_with', () => {
    it('возвращает true если строка заканчивается паттерном', () => {
      expect(matchesFilter('Новости спорта', 'ends_with', 'спорта')).toBe(true);
    });

    it('возвращает false если строка не заканчивается паттерном', () => {
      expect(matchesFilter('Спорт: главные новости', 'ends_with', 'спорт')).toBe(false);
    });
  });

  describe('оператор regex', () => {
    it('применяет регулярное выражение', () => {
      expect(matchesFilter('Новость №123', 'regex', '\\d+')).toBe(true);
    });

    it('нечувствителен к регистру (флаг i)', () => {
      expect(matchesFilter('СПОРТ', 'regex', 'спорт')).toBe(true);
    });

    it('возвращает false при невалидном regex', () => {
      expect(matchesFilter('текст', 'regex', '[invalid(')).toBe(false);
    });
  });

  describe('неизвестный оператор', () => {
    it('возвращает false', () => {
      expect(matchesFilter('текст', 'unknown_op', 'текст')).toBe(false);
    });
  });
});

describe('shouldIncludeItem', () => {
  const makeEntry = (overrides = {}) => ({
    title: 'Новость о спорте',
    contentSnippet: 'Подробности о спортивных событиях',
    categories: ['спорт', 'футбол'],
    author: 'Иван Иванов',
    link: 'https://example.com/sport/news-1',
    ...overrides,
  });

  it('возвращает true если фильтров нет', () => {
    expect(shouldIncludeItem(makeEntry(), [])).toBe(true);
    expect(shouldIncludeItem(makeEntry(), null)).toBe(true);
    expect(shouldIncludeItem(makeEntry(), undefined)).toBe(true);
  });

  it('возвращает true если все фильтры неактивны', () => {
    const filters = [
      { type: 'EXCLUDE', field: 'title', operator: 'contains', value: 'спорт', isActive: false },
    ];
    expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
  });

  describe('INCLUDE-фильтры', () => {
    it('включает запись если INCLUDE-фильтр совпадает', () => {
      const filters = [
        { type: 'INCLUDE', field: 'title', operator: 'contains', value: 'спорт', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
    });

    it('исключает запись если ни один INCLUDE-фильтр не совпадает', () => {
      const filters = [
        { type: 'INCLUDE', field: 'title', operator: 'contains', value: 'политика', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(false);
    });

    it('INCLUDE OR-логика: достаточно одного совпадения', () => {
      const filters = [
        { type: 'INCLUDE', field: 'title', operator: 'contains', value: 'политика', isActive: true },
        { type: 'INCLUDE', field: 'title', operator: 'contains', value: 'спорт', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
    });
  });

  describe('EXCLUDE-фильтры', () => {
    it('исключает запись если EXCLUDE-фильтр совпадает', () => {
      const filters = [
        { type: 'EXCLUDE', field: 'title', operator: 'contains', value: 'спорт', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(false);
    });

    it('включает запись если EXCLUDE-фильтр не совпадает', () => {
      const filters = [
        { type: 'EXCLUDE', field: 'title', operator: 'contains', value: 'политика', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
    });
  });

  describe('комбинированные фильтры', () => {
    it('INCLUDE совпал, но EXCLUDE тоже — исключает', () => {
      const filters = [
        { type: 'INCLUDE', field: 'title', operator: 'contains', value: 'спорт', isActive: true },
        { type: 'EXCLUDE', field: 'title', operator: 'contains', value: 'спорт', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(false);
    });
  });

  describe('различные поля', () => {
    it('фильтрует по полю content', () => {
      const filters = [
        { type: 'INCLUDE', field: 'content', operator: 'contains', value: 'спортивных', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
    });

    it('фильтрует по полю category', () => {
      const filters = [
        { type: 'INCLUDE', field: 'category', operator: 'contains', value: 'футбол', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
    });

    it('фильтрует по полю author', () => {
      const filters = [
        { type: 'EXCLUDE', field: 'author', operator: 'contains', value: 'иванов', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(false);
    });

    it('фильтрует по полю url', () => {
      const filters = [
        { type: 'INCLUDE', field: 'url', operator: 'contains', value: 'sport', isActive: true },
      ];
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(true);
    });

    it('неизвестное поле возвращает пустую строку', () => {
      const filters = [
        { type: 'INCLUDE', field: 'unknown_field', operator: 'contains', value: 'спорт', isActive: true },
      ];
      // Неизвестное поле → пустое значение → INCLUDE не совпадает → false
      expect(shouldIncludeItem(makeEntry(), filters)).toBe(false);
    });
  });
});
