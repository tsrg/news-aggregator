import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hash,
      role: 'ADMIN',
    },
  });
  await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      passwordHash: await bcrypt.hash('editor123', 10),
      role: 'EDITOR',
    },
  });
  const draft = await prisma.source.findFirst({ where: { name: 'Ручной ввод' } });
  if (!draft) {
    await prisma.source.create({
      data: {
        type: 'rss',
        url: 'https://example.com/draft',
        name: 'Ручной ввод',
        isActive: false,
      },
    });
  }
  const lenta = await prisma.source.findFirst({ where: { url: 'http://lenta.ru/rss/news' } });
  if (!lenta) {
    await prisma.source.create({
      data: {
        type: 'rss',
        url: 'http://lenta.ru/rss/news',
        name: 'Lenta.ru — Новости',
        isActive: true,
      },
    });
  }
  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
