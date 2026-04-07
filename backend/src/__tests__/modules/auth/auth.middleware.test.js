import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Мокаем Prisma до импорта middleware
vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Мокаем конфиг, чтобы не читать .env
vi.mock('../../../config/index.js', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '1h',
    },
    nodeEnv: 'test',
  },
}));

import { requireAuth, requirePermission, requireAdmin } from '../../../modules/auth/auth.middleware.js';
import { prisma } from '../../../config/prisma.js';

const TEST_SECRET = 'test-secret-key';

// Тестовый пользователь
const mockUser = {
  id: 'user-123',
  email: 'admin@test.com',
  passwordHash: 'hash',
  roleId: 'role-1',
  roleRef: {
    id: 'role-1',
    slug: 'admin',
    name: 'Администратор',
    isFullAccess: true,
    permissions: [],
  },
};

const mockEditorUser = {
  ...mockUser,
  id: 'user-456',
  email: 'editor@test.com',
  roleRef: {
    id: 'role-2',
    slug: 'editor',
    name: 'Редактор',
    isFullAccess: false,
    permissions: [
      { permission: { code: 'news' } },
      { permission: { code: 'sections' } },
    ],
  },
};

// Хелпер для создания mock req/res/next
function createMocks(overrides = {}) {
  const req = {
    headers: {},
    cookies: {},
    ...overrides,
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 401 если токен отсутствует', async () => {
    const { req, res, next } = createMocks();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401 при невалидном токене', async () => {
    const { req, res, next } = createMocks({
      headers: { authorization: 'Bearer invalid-token' },
    });
    prisma.user.findUnique.mockResolvedValue(null);
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('аутентифицирует через Bearer-токен', async () => {
    const token = jwt.sign({ userId: mockUser.id }, TEST_SECRET);
    const { req, res, next } = createMocks({
      headers: { authorization: `Bearer ${token}` },
    });
    prisma.user.findUnique.mockResolvedValue(mockUser);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe(mockUser.id);
    expect(req.isFullAccess).toBe(true);
    expect(req.permissions).toBeNull(); // null для полного доступа
  });

  it('аутентифицирует через cookie admin_session', async () => {
    const token = jwt.sign({ userId: mockUser.id }, TEST_SECRET);
    const { req, res, next } = createMocks({
      cookies: { admin_session: token },
    });
    prisma.user.findUnique.mockResolvedValue(mockUser);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe(mockUser.id);
  });

  it('устанавливает permissions для пользователя без полного доступа', async () => {
    const token = jwt.sign({ userId: mockEditorUser.id }, TEST_SECRET);
    const { req, res, next } = createMocks({
      headers: { authorization: `Bearer ${token}` },
    });
    prisma.user.findUnique.mockResolvedValue(mockEditorUser);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.isFullAccess).toBe(false);
    expect(req.permissions).toEqual(['news', 'sections']);
  });

  it('возвращает 401 если пользователь не найден в БД', async () => {
    const token = jwt.sign({ userId: 'ghost-id' }, TEST_SECRET);
    const { req, res, next } = createMocks({
      headers: { authorization: `Bearer ${token}` },
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requirePermission', () => {
  it('пропускает пользователя с isFullAccess', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = true;

    const middleware = requirePermission('news');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('пропускает пользователя с нужным разрешением', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = false;
    req.permissions = ['news', 'sections'];

    const middleware = requirePermission('news');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('возвращает 403 если разрешения нет', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = false;
    req.permissions = ['sections'];

    const middleware = requirePermission('news');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 403 если permissions = null и isFullAccess = false', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = false;
    req.permissions = null;

    const middleware = requirePermission('news');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireAdmin', () => {
  it('пропускает пользователя с isFullAccess', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = true;
    req.roleRef = { slug: 'editor' };

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('пропускает пользователя с slug = admin', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = false;
    req.roleRef = { slug: 'admin' };

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('возвращает 403 для обычного пользователя', () => {
    const { req, res, next } = createMocks();
    req.isFullAccess = false;
    req.roleRef = { slug: 'editor' };

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
