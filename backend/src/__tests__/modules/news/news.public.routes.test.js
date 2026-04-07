import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from 'node:http';
import express from 'express';

// Мокаем зависимости до импорта роутов
vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    newsItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../../services/s3.js', () => ({
  rewriteStorageUrlForBrowser: vi.fn((url) => url),
}));

import newsPublic from '../../../modules/news/news.public.routes.js';
import { prisma } from '../../../config/prisma.js';

// Хелпер: запустить тест-сервер и сделать запрос
async function request(method, path, { body, headers = {} } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/news', newsPublic);

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`http://localhost:${port}${path}`, opts);
  const json = await res.json().catch(() => null);
  await new Promise((resolve) => server.close(resolve));
  return { status: res.status, body: json };
}

const makeNewsItem = (overrides = {}) => ({
  id: 'news-1',
  title: 'Тестовая новость',
  summary: 'Краткое содержание',
  body: '<p>Текст статьи</p>',
  url: 'https://source.com/article-1',
  imageUrl: null,
  status: 'PUBLISHED',
  region: 'Москва',
  publishedAt: new Date('2024-01-15T12:00:00Z'),
  sourcePublishedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T11:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  mergedIntoId: null,
  sectionId: null,
  sourceId: 'src-1',
  section: null,
  source: { id: 'src-1', name: 'Test Source' },
  externalId: 'ext-1',
  ...overrides,
});

describe('GET /api/news', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает список опубликованных новостей', async () => {
    const items = [makeNewsItem()];
    prisma.newsItem.findMany.mockResolvedValue(items);
    prisma.newsItem.count.mockResolvedValue(1);

    const { status, body } = await request('GET', '/api/news');

    expect(status).toBe(200);
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total', 1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('news-1');
  });

  it('передаёт фильтры в запрос к БД', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/news?region=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&section=sec-1');

    const whereArg = prisma.newsItem.findMany.mock.calls[0][0].where;
    expect(whereArg.region).toBe('Москва');
    expect(whereArg.sectionId).toBe('sec-1');
    expect(whereArg.status).toBe('PUBLISHED');
    expect(whereArg.mergedIntoId).toBeNull();
  });

  it('поддерживает фильтр noRegion', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/news?noRegion=1');

    const whereArg = prisma.newsItem.findMany.mock.calls[0][0].where;
    expect(whereArg).toHaveProperty('OR');
    expect(whereArg.OR).toEqual([{ region: null }, { region: '' }]);
  });

  it('поддерживает фильтр dateFrom и dateTo', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/news?dateFrom=2024-01-01&dateTo=2024-12-31');

    const whereArg = prisma.newsItem.findMany.mock.calls[0][0].where;
    expect(whereArg.publishedAt.gte).toBeInstanceOf(Date);
    expect(whereArg.publishedAt.lte).toBeInstanceOf(Date);
  });

  it('ограничивает limit до 100', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/news?limit=999');

    const takeArg = prisma.newsItem.findMany.mock.calls[0][0].take;
    expect(takeArg).toBe(100);
  });

  it('возвращает 500 при ошибке БД', async () => {
    // Глушим console.error — роут намеренно логирует пойманное исключение,
    // это не признак бага, просто шум в выводе тестов
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    prisma.newsItem.findMany.mockRejectedValue(new Error('DB error'));
    prisma.newsItem.count.mockRejectedValue(new Error('DB error'));

    const { status, body } = await request('GET', '/api/news');
    expect(status).toBe(500);
    expect(body.error).toBeDefined();

    spy.mockRestore();
  });
});

describe('GET /api/news/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает опубликованную новость по id', async () => {
    const item = makeNewsItem();
    prisma.newsItem.findFirst
      .mockResolvedValueOnce(item)   // первый вызов: найти по id
      .mockResolvedValueOnce(item);  // второй вызов: найти published

    const { status, body } = await request('GET', '/api/news/news-1');

    expect(status).toBe(200);
    expect(body.id).toBe('news-1');
    expect(body.title).toBe('Тестовая новость');
  });

  it('возвращает 404 если новость не найдена', async () => {
    prisma.newsItem.findFirst.mockResolvedValue(null);

    const { status, body } = await request('GET', '/api/news/nonexistent');

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('возвращает 404 если новость найдена, но не опубликована', async () => {
    const pendingItem = makeNewsItem({ status: 'PENDING' });
    prisma.newsItem.findFirst
      .mockResolvedValueOnce(pendingItem) // нашли запись
      .mockResolvedValueOnce(null);       // но published нет

    const { status, body } = await request('GET', '/api/news/news-1');

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('разрешает merged-запись — возвращает canonical', async () => {
    const mergedItem = makeNewsItem({ id: 'old-1', mergedIntoId: 'news-2' });
    const canonicalItem = makeNewsItem({ id: 'news-2', title: 'Каноническая новость' });

    prisma.newsItem.findFirst
      .mockResolvedValueOnce(mergedItem)    // нашли merged запись
      .mockResolvedValueOnce(canonicalItem); // нашли canonical

    const { status, body } = await request('GET', '/api/news/old-1');

    expect(status).toBe(200);
    expect(body.id).toBe('news-2');
    expect(body.title).toBe('Каноническая новость');
  });
});
