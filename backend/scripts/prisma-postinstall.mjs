/**
 * postinstall: prisma generate только если есть схема (в Docker сначала копируют только package.json).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const schema = path.join(root, 'prisma', 'schema.prisma');

if (!fs.existsSync(schema)) {
  console.log(
    '[postinstall] prisma generate skipped: prisma/schema.prisma not present yet (e.g. Docker before COPY prisma)',
  );
  process.exit(0);
}

const result = spawnSync('npx', ['prisma', 'generate'], { cwd: root, stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
