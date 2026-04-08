/**
 * В npm workspaces @prisma/client часто в корневом node_modules, а `prisma generate`
 * кладёт клиент в backend/node_modules/.prisma — тогда prisma.adPlacement === undefined.
 * Копируем сгенерированный .prisma в корень, если там есть @prisma/client.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const backendPrisma = path.join(root, 'backend/node_modules/.prisma');
const rootPrisma = path.join(root, 'node_modules/.prisma');
const rootPrismaClient = path.join(root, 'node_modules/@prisma/client');

if (!fs.existsSync(backendPrisma)) {
  console.warn('[sync-prisma-client] skip: no backend/node_modules/.prisma (run: cd backend && npx prisma generate)');
  process.exit(0);
}

if (!fs.existsSync(rootPrismaClient)) {
  console.warn('[sync-prisma-client] skip: no hoisted root node_modules/@prisma/client');
  process.exit(0);
}

fs.rmSync(rootPrisma, { recursive: true, force: true });
fs.cpSync(backendPrisma, rootPrisma, { recursive: true });
console.log('[sync-prisma-client] copied backend/node_modules/.prisma -> node_modules/.prisma');
