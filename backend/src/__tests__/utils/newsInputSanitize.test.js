import { describe, it, expect } from 'vitest';
import {
  stripNullBytes,
  sanitizeNewsStrings,
} from '../../utils/newsInputSanitize.js';

describe('stripNullBytes', () => {
  it('возвращает строку без NUL-байтов', () => {
    expect(stripNullBytes('hello\0world')).toBe('helloworld');
  });

  it('возвращает строку без изменений, если NUL-байтов нет', () => {
    expect(stripNullBytes('hello world')).toBe('hello world');
  });

  it('удаляет несколько NUL-байтов', () => {
    expect(stripNullBytes('\0a\0b\0c')).toBe('abc');
  });

  it('возвращает не-строки без изменений', () => {
    expect(stripNullBytes(null)).toBeNull();
    expect(stripNullBytes(42)).toBe(42);
    expect(stripNullBytes(undefined)).toBeUndefined();
  });

  it('обрабатывает пустую строку', () => {
    expect(stripNullBytes('')).toBe('');
  });
});

describe('sanitizeNewsStrings', () => {
  it('очищает NUL-байты в строковых полях', () => {
    const result = sanitizeNewsStrings({
      title: 'Заголовок\0с NUL',
      summary: 'Краткое\0содержание',
      body: 'Тело\0статьи',
      url: 'https://example.com/\0path',
      imageUrl: 'https://example.com/image\0.jpg',
      region: 'Москва\0',
      legalReviewNotes: 'Примечание\0',
    });

    expect(result.title).toBe('Заголовокс NUL'); // NUL-байт между "Заголовок" и "с" удалён
    expect(result.summary).toBe('Краткоесодержание');
    expect(result.body).toBe('Телостатьи');
    expect(result.url).toBe('https://example.com/path');
    expect(result.imageUrl).toBe('https://example.com/image.jpg');
    expect(result.region).toBe('Москва');
    expect(result.legalReviewNotes).toBe('Примечание');
  });

  it('не изменяет поля без NUL-байтов', () => {
    const data = {
      title: 'Чистый заголовок',
      body: 'Чистое тело',
    };
    const result = sanitizeNewsStrings(data);
    expect(result.title).toBe('Чистый заголовок');
    expect(result.body).toBe('Чистое тело');
  });

  it('не трогает нестроковые поля', () => {
    const data = {
      title: 'Заголовок',
      sectionId: null,
      someNumber: 42,
    };
    const result = sanitizeNewsStrings(data);
    expect(result.sectionId).toBeNull();
    expect(result.someNumber).toBe(42);
  });

  it('не мутирует оригинальный объект', () => {
    const data = { title: 'Заголовок\0' };
    sanitizeNewsStrings(data);
    expect(data.title).toBe('Заголовок\0');
  });
});
