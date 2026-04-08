/**
 * Ответ клиенту при ошибке Prisma с понятной подсказкой (миграции / generate).
 * @param {import('express').Response} res
 * @param {unknown} err
 * @param {string} [context]
 * @returns {import('express').Response|void}
 */
export function sendPrismaClientError(res, err, context = '') {
  const e = err && typeof err === 'object' ? err : { message: String(err) };
  const code = 'code' in e ? e.code : undefined;
  const message = 'message' in e ? String(e.message) : String(err);
  const dev = process.env.NODE_ENV !== 'production';

  if (context) console.error(`[${context}]`, err);

  /** Схема prisma обновлена, а сгенерированный @prisma/client старый (часто в npm workspaces без postinstall). */
  const staleGeneratedClient = /Cannot read properties of undefined \(reading '(findMany|create|update|delete|upsert|count)'\)/.test(
    message,
  );

  if (staleGeneratedClient) {
    return res.status(503).json({
      error:
        'Prisma Client не совпадает со схемой (npm workspaces: клиент в корневом node_modules, generate — в backend). Из корня репозитория: npm run db:generate. Либо: cd backend && npx prisma generate && node ../scripts/sync-prisma-client.mjs. Затем перезапустите API.',
      ...(dev && { detail: message }),
    });
  }

  const missingTable =
    code === 'P2021' ||
    /relation .* does not exist|table .* does not exist|не существует/i.test(message);

  if (missingTable) {
    return res.status(503).json({
      error:
        'Схема БД без таблиц рекламы. Выполните: npx prisma migrate deploy (в Docker: docker compose exec backend npx prisma migrate deploy)',
      ...(dev && { prismaCode: code, detail: message }),
    });
  }

  if (dev) {
    return res.status(500).json({
      error: 'Internal server error',
      detail: message,
      prismaCode: code,
    });
  }

  return res.status(500).json({ error: 'Internal server error' });
}
