import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// ─── Моки (до импорта роутов) ────────────────────────────────────────────────

vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    authRole: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async () => 'hashed-password'),
  },
}));

vi.mock('../../../modules/auth/auth.middleware.js', () => ({
  requireAuth: vi.fn((req, _res, next) => {
    req.userId = 'current-user-id';
    req.isFullAccess = true;
    req.permissions = null;
    next();
  }),
  requirePermission: vi.fn(() => (_req, _res, next) => next()),
}));

import usersAdmin from '../../../modules/users/users.admin.routes.js';
import { prisma } from '../../../config/prisma.js';
import bcrypt from 'bcrypt';

// ─── Хелперы ─────────────────────────────────────────────────────────────────

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/users', usersAdmin);
  return app;
}

const mockRole = { id: 'role-1', name: 'Администратор', slug: 'admin' };

const mockUser = {
  id: 'user-1',
  email: 'user@test.com',
  roleId: 'role-1',
  createdAt: new Date('2024-01-01').toISOString(),
  roleRef: { id: 'role-1', name: 'Администратор', slug: 'admin' },
};

// ─── GET / ────────────────────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает список пользователей', async () => {
    prisma.user.findMany.mockResolvedValue([mockUser]);

    const res = await supertest(makeApp()).get('/api/admin/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([mockUser]);
    expect(prisma.user.findMany).toHaveBeenCalledOnce();
  });

  it('возвращает пустой массив если пользователей нет', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    const res = await supertest(makeApp()).get('/api/admin/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('возвращает 500 при ошибке БД', async () => {
    prisma.user.findMany.mockRejectedValue(new Error('DB error'));

    const res = await supertest(makeApp()).get('/api/admin/users');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/users/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает пользователя по id', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await supertest(makeApp()).get('/api/admin/users/user-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUser);
  });

  it('возвращает 404 если пользователь не найден', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await supertest(makeApp()).get('/api/admin/users/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('возвращает 500 при ошибке БД', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    const res = await supertest(makeApp()).get('/api/admin/users/user-1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe('POST /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('создаёт нового пользователя', async () => {
    prisma.authRole.findUnique.mockResolvedValue(mockRole);
    prisma.user.create.mockResolvedValue(mockUser);

    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'user@test.com', password: 'secret123', roleId: 'role-1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockUser);
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'user@test.com',
          passwordHash: 'hashed-password',
          roleId: 'role-1',
        }),
      }),
    );
  });

  it('возвращает 400 если роль не найдена', async () => {
    prisma.authRole.findUnique.mockResolvedValue(null);

    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'user@test.com', password: 'secret123', roleId: 'bad-role' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid role' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('возвращает 400 при невалидном email', async () => {
    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'not-an-email', password: 'secret123', roleId: 'role-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('возвращает 400 если пароль короче 6 символов', async () => {
    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'user@test.com', password: '123', roleId: 'role-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('возвращает 400 если roleId отсутствует', async () => {
    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'user@test.com', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('возвращает 400 при дублирующемся email (P2002)', async () => {
    prisma.authRole.findUnique.mockResolvedValue(mockRole);
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    prisma.user.create.mockRejectedValue(err);

    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'user@test.com', password: 'secret123', roleId: 'role-1' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email already exists' });
  });

  it('возвращает 500 при ошибке БД', async () => {
    prisma.authRole.findUnique.mockResolvedValue(mockRole);
    prisma.user.create.mockRejectedValue(new Error('DB error'));

    const res = await supertest(makeApp())
      .post('/api/admin/users')
      .send({ email: 'user@test.com', password: 'secret123', roleId: 'role-1' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

describe('PUT /api/admin/users/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('обновляет email пользователя', async () => {
    const updated = { ...mockUser, email: 'new@test.com' };
    prisma.user.update.mockResolvedValue(updated);

    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ email: 'new@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('new@test.com');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { email: 'new@test.com' },
      }),
    );
  });

  it('обновляет роль пользователя', async () => {
    const newRole = { id: 'role-2', name: 'Редактор', slug: 'editor' };
    prisma.authRole.findUnique.mockResolvedValue(newRole);
    prisma.user.update.mockResolvedValue({ ...mockUser, roleId: 'role-2' });

    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ roleId: 'role-2' });

    expect(res.status).toBe(200);
    expect(prisma.authRole.findUnique).toHaveBeenCalledWith({ where: { id: 'role-2' } });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roleId: 'role-2' }),
      }),
    );
  });

  it('хеширует новый пароль при обновлении', async () => {
    prisma.user.update.mockResolvedValue(mockUser);

    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ password: 'newpassword' });

    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: 'hashed-password' }),
      }),
    );
  });

  it('возвращает 400 при попытке изменить собственный аккаунт', async () => {
    const res = await supertest(makeApp())
      .put('/api/admin/users/current-user-id')
      .send({ email: 'me@test.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Use profile settings to change your own account' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('возвращает 400 если указанная роль не существует', async () => {
    prisma.authRole.findUnique.mockResolvedValue(null);

    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ roleId: 'bad-role' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid role' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('возвращает 400 при невалидном email', async () => {
    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('возвращает 400 при дублирующемся email (P2002)', async () => {
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    prisma.user.update.mockRejectedValue(err);

    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ email: 'taken@test.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email already exists' });
  });

  it('возвращает 404 если пользователь не найден (P2025)', async () => {
    const err = new Error('Record not found');
    err.code = 'P2025';
    prisma.user.update.mockRejectedValue(err);

    const res = await supertest(makeApp())
      .put('/api/admin/users/nonexistent')
      .send({ email: 'x@test.com' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('возвращает 500 при ошибке БД', async () => {
    prisma.user.update.mockRejectedValue(new Error('DB error'));

    const res = await supertest(makeApp())
      .put('/api/admin/users/user-1')
      .send({ email: 'x@test.com' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe('DELETE /api/admin/users/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('удаляет пользователя и возвращает 204', async () => {
    prisma.user.delete.mockResolvedValue(mockUser);

    const res = await supertest(makeApp()).delete('/api/admin/users/user-1');

    expect(res.status).toBe(204);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('возвращает 400 при попытке удалить собственный аккаунт', async () => {
    const res = await supertest(makeApp()).delete('/api/admin/users/current-user-id');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Cannot delete your own account' });
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('возвращает 404 если пользователь не найден (P2025)', async () => {
    const err = new Error('Record not found');
    err.code = 'P2025';
    prisma.user.delete.mockRejectedValue(err);

    const res = await supertest(makeApp()).delete('/api/admin/users/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('возвращает 500 при ошибке БД', async () => {
    prisma.user.delete.mockRejectedValue(new Error('DB error'));

    const res = await supertest(makeApp()).delete('/api/admin/users/user-1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
