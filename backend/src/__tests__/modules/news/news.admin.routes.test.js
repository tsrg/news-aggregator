import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from 'node:http';
import express from 'express';

// ─── Моки (до импорта роутов) ────────────────────────────────────────────────

vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    newsItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    newsItemHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    source: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../../services/s3.js', () => ({
  rewriteStorageUrlForBrowser: vi.fn((url) => url),
}));

vi.mock('../../../ws.js', () => ({
  broadcastNewsPublished: vi.fn(),
  broadcastNewsUpdated: vi.fn(),
}));

vi.mock('../../../jobs/queue.js', () => ({
  articleQueue: null,
  getArticleQueue: vi.fn(() => null),
}));

vi.mock('../../../services/newsMerge.js', () => ({
  runDuplicateMergeBatch: vi.fn(),
}));

vi.mock('../../../services/legalCompliance.js', () => ({
  runLegalComplianceChecks: vi.fn(() => ({
    legalReviewStatus: 'APPROVED',
    legalReviewNotes: null,
    contentClass: 'NEWS',
    checks: {},
  })),
}));

vi.mock('../../../services/titleNormalize.js', () => ({
  normalizeTitleForIndex: vi.fn((s) => String(s || '').toLowerCase()),
}));

// Мокаем auth middleware — bypass authentication
vi.mock('../../../modules/auth/auth.middleware.js', () => ({
  requireAuth: vi.fn((req, _res, next) => {
    req.userId = 'test-user-id';
    req.isFullAccess = true;
    req.permissions = null;
    next();
  }),
  requirePermission: vi.fn(() => (_req, _res, next) => next()),
}));

import newsAdmin from '../../../modules/news/news.admin.routes.js';
import { prisma } from '../../../config/prisma.js';

// ─── Хелперы ─────────────────────────────────────────────────────────────────

async function request(method, path, { body, headers = {} } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/news', newsAdmin);

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
  id: 'news-admin-1',
  title: 'Тестовая новость',
  summary: 'Краткое содержание',
  body: '<p>Тело статьи</p>',
  url: 'https://source.com/article-1',
  imageUrl: null,
  status: 'PENDING',
  region: null,
  publishedAt: null,
  sourcePublishedAt: null,
  createdAt: new Date('2024-01-15T11:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  mergedIntoId: null,
  titleNormalized: 'тестовая новость',
  contentClass: 'NEWS',
  legalReviewStatus: 'PENDING',
  legalReviewNotes: null,
  sectionId: null,
  sourceId: 'src-1',
  section: null,
  source: { id: 'src-1', name: 'Test Source', usageRule: null },
  externalId: 'ext-1',
  sourceSnapshots: null,
  confirmedFacts: null,
  differences: null,
  ...overrides,
});

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('GET /api/admin/news', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает список новостей с пагинацией', async () => {
    const items = [makeNewsItem()];
    prisma.newsItem.findMany.mockResolvedValue(items);
    prisma.newsItem.count.mockResolvedValue(1);

    const { status, body } = await request('GET', '/api/admin/news');

    expect(status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('фильтрует по статусу', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/admin/news?status=PUBLISHED');

    const where = prisma.newsItem.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PUBLISHED');
  });

  it('фильтрует по region', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/admin/news?region=test-region');

    const where = prisma.newsItem.findMany.mock.calls[0][0].where;
    expect(where.region).toBe('test-region');
  });

  it('исключает merged-записи (mergedIntoId: null)', async () => {
    prisma.newsItem.findMany.mockResolvedValue([]);
    prisma.newsItem.count.mockResolvedValue(0);

    await request('GET', '/api/admin/news');

    const where = prisma.newsItem.findMany.mock.calls[0][0].where;
    expect(where.mergedIntoId).toBeNull();
  });
});

describe('GET /api/admin/news/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает новость по id', async () => {
    prisma.newsItem.findUnique.mockResolvedValue(makeNewsItem());

    const { status, body } = await request('GET', '/api/admin/news/news-admin-1');

    expect(status).toBe(200);
    expect(body.id).toBe('news-admin-1');
  });

  it('возвращает 404 если не найдена', async () => {
    prisma.newsItem.findUnique.mockResolvedValue(null);

    const { status, body } = await request('GET', '/api/admin/news/nonexistent');

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });
});

describe('GET /api/admin/news/:id/history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает историю версий', async () => {
    const history = [
      { id: 'hist-1', newsItemId: 'news-admin-1', snapshot: {}, createdAt: new Date() },
    ];
    prisma.newsItemHistory.findMany.mockResolvedValue(history);

    const { status, body } = await request('GET', '/api/admin/news/news-admin-1/history');

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });
});

describe('POST /api/admin/news', () => {
  beforeEach(() => vi.clearAllMocks());

  it('создаёт новость', async () => {
    prisma.source.findFirst.mockResolvedValue({ id: 'src-manual', name: 'Ручной ввод' });
    const created = makeNewsItem({ title: 'Новая новость' });
    prisma.newsItem.create.mockResolvedValue(created);
    prisma.newsItemHistory.create.mockResolvedValue({});

    const { status, body } = await request('POST', '/api/admin/news', {
      body: { title: 'Новая новость', body: '<p>Текст</p>' },
    });

    expect(status).toBe(201);
    expect(body.title).toBe('Новая новость');
    expect(prisma.newsItemHistory.create).toHaveBeenCalled();
  });

  it('возвращает 400 при ошибке валидации (нет title)', async () => {
    const { status, body } = await request('POST', '/api/admin/news', {
      body: { summary: 'Только саммари, без заголовка' },
    });

    expect(status).toBe(400);
    expect(body.error).toContain('Validation');
  });

  it('возвращает 400 если нет источника "Ручной ввод"', async () => {
    prisma.source.findFirst.mockResolvedValue(null);

    const { status, body } = await request('POST', '/api/admin/news', {
      body: { title: 'Новая новость' },
    });

    expect(status).toBe(400);
    expect(body.error).toContain('seed');
  });
});

describe('PUT /api/admin/news/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('обновляет новость', async () => {
    const existing = makeNewsItem();
    const updated = makeNewsItem({ title: 'Обновлённый заголовок' });
    prisma.newsItem.findUnique.mockResolvedValue(existing);
    prisma.newsItem.update.mockResolvedValue(updated);
    prisma.newsItemHistory.create.mockResolvedValue({});

    const { status, body } = await request('PUT', '/api/admin/news/news-admin-1', {
      body: { title: 'Обновлённый заголовок' },
    });

    expect(status).toBe(200);
    expect(body.title).toBe('Обновлённый заголовок');
  });

  it('возвращает 404 если новость не найдена', async () => {
    prisma.newsItem.findUnique.mockResolvedValue(null);

    const { status, body } = await request('PUT', '/api/admin/news/nonexistent', {
      body: { title: 'Заголовок' },
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('сбрасывает legalReviewStatus при изменении контента', async () => {
    const existing = makeNewsItem({ legalReviewStatus: 'APPROVED' });
    const updated = makeNewsItem({ legalReviewStatus: 'PENDING' });
    prisma.newsItem.findUnique.mockResolvedValue(existing);
    prisma.newsItem.update.mockResolvedValue(updated);
    prisma.newsItemHistory.create.mockResolvedValue({});

    await request('PUT', '/api/admin/news/news-admin-1', {
      body: { title: 'Полностью новый заголовок статьи' },
    });

    const updateData = prisma.newsItem.update.mock.calls[0][0].data;
    expect(updateData.legalReviewStatus).toBe('PENDING');
    expect(updateData.legalReviewNotes).toBeNull();
  });
});

describe('PATCH /api/admin/news/:id/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('обновляет статус на REJECTED', async () => {
    const existing = makeNewsItem();
    const updated = makeNewsItem({ status: 'REJECTED' });
    prisma.newsItem.findUnique.mockResolvedValue(existing);
    prisma.newsItem.update.mockResolvedValue(updated);
    prisma.newsItemHistory.create.mockResolvedValue({});

    const { status, body } = await request('PATCH', '/api/admin/news/news-admin-1/status', {
      body: { status: 'REJECTED' },
    });

    expect(status).toBe(200);
    expect(body.status).toBe('REJECTED');
  });

  it('обновляет статус на PENDING', async () => {
    const existing = makeNewsItem({ status: 'REJECTED' });
    const updated = makeNewsItem({ status: 'PENDING' });
    prisma.newsItem.findUnique.mockResolvedValue(existing);
    prisma.newsItem.update.mockResolvedValue(updated);
    prisma.newsItemHistory.create.mockResolvedValue({});

    const { status } = await request('PATCH', '/api/admin/news/news-admin-1/status', {
      body: { status: 'PENDING' },
    });

    expect(status).toBe(200);
  });

  it('публикует новость: устанавливает publishedAt', async () => {
    const existing = makeNewsItem();
    const updated = makeNewsItem({ status: 'PUBLISHED', publishedAt: new Date() });
    prisma.newsItem.findUnique.mockResolvedValue(existing);
    prisma.newsItem.update.mockResolvedValue(updated);
    prisma.newsItemHistory.create.mockResolvedValue({});
    prisma.source.findMany.mockResolvedValue([]);

    const { status, body } = await request('PATCH', '/api/admin/news/news-admin-1/status', {
      body: { status: 'PUBLISHED' },
    });

    expect(status).toBe(200);
    const updateData = prisma.newsItem.update.mock.calls[0][0].data;
    expect(updateData.publishedAt).toBeInstanceOf(Date);
    expect(updateData.legalReviewStatus).toBe('APPROVED');
  });

  it('возвращает 400 при невалидном статусе', async () => {
    const { status, body } = await request('PATCH', '/api/admin/news/news-admin-1/status', {
      body: { status: 'INVALID_STATUS' },
    });

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid status');
  });

  it('возвращает 404 если новость не найдена', async () => {
    prisma.newsItem.findUnique.mockResolvedValue(null);

    const { status } = await request('PATCH', '/api/admin/news/nonexistent/status', {
      body: { status: 'PUBLISHED' },
    });

    expect(status).toBe(404);
  });
});

describe('DELETE /api/admin/news/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('удаляет новость, возвращает 204', async () => {
    prisma.newsItem.findUnique.mockResolvedValue(makeNewsItem());
    prisma.newsItem.delete.mockResolvedValue({});

    const { status } = await request('DELETE', '/api/admin/news/news-admin-1');

    expect(status).toBe(204);
    expect(prisma.newsItem.delete).toHaveBeenCalledWith({ where: { id: 'news-admin-1' } });
  });

  it('возвращает 404 если новость не найдена', async () => {
    prisma.newsItem.findUnique.mockResolvedValue(null);

    const { status, body } = await request('DELETE', '/api/admin/news/nonexistent');

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(prisma.newsItem.delete).not.toHaveBeenCalled();
  });
});
