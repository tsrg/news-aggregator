import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSION_CODES = [
  { code: 'news', name: 'Новости' },
  { code: 'pages', name: 'Страницы' },
  { code: 'sections', name: 'Разделы' },
  { code: 'menus', name: 'Меню' },
  { code: 'sources', name: 'Источники' },
  { code: 'users', name: 'Пользователи' },
  { code: 'roles', name: 'Роли' },
  { code: 'settings', name: 'Настройки' },
];

async function main() {
  // Permissions
  for (const p of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: p,
    });
  }

  // Roles: Admin (full access), Editor (news only)
  const adminRole = await prisma.authRole.upsert({
    where: { slug: 'admin' },
    update: { name: 'Администратор', isFullAccess: true },
    create: { name: 'Администратор', slug: 'admin', isFullAccess: true },
  });
  const editorRole = await prisma.authRole.upsert({
    where: { slug: 'editor' },
    update: { name: 'Редактор', isFullAccess: false },
    create: { name: 'Редактор', slug: 'editor', isFullAccess: false },
  });

  const newsPerm = await prisma.permission.findUnique({ where: { code: 'news' } });
  if (newsPerm) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: editorRole.id, permissionId: newsPerm.id } },
      update: {},
      create: { roleId: editorRole.id, permissionId: newsPerm.id },
    });
  }

  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'admin@example.com',
      passwordHash: hash,
      roleId: adminRole.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: { roleId: editorRole.id },
    create: {
      email: 'editor@example.com',
      passwordHash: await bcrypt.hash('editor123', 10),
      roleId: editorRole.id,
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

  const sectionSlugs = [
    { slug: 'top', title: 'Главное', order: 0 },
    { slug: 'region', title: 'Новости региона', order: 1 },
    { slug: 'politics', title: 'Политика', order: 2 },
    { slug: 'society', title: 'Общество', order: 3 },
    { slug: 'incidents', title: 'Происшествия', order: 4 },
    { slug: 'sport', title: 'Спорт', order: 5 },
    { slug: 'culture', title: 'Культура', order: 6 },
    { slug: 'economy', title: 'Экономика', order: 7 },
    { slug: 'general', title: 'Общие новости', order: 8 },
  ];
  const sectionIds = {};
  for (const s of sectionSlugs) {
    const sec = await prisma.section.upsert({
      where: { slug: s.slug },
      update: { title: s.title, order: s.order },
      create: { slug: s.slug, title: s.title, order: s.order },
    });
    sectionIds[s.slug] = sec.id;
  }

  const headerMenu = await prisma.menu.upsert({
    where: { key: 'header' },
    update: {},
    create: { key: 'header', name: 'Главное меню' },
  });
  const footerMenu = await prisma.menu.upsert({
    where: { key: 'footer' },
    update: {},
    create: { key: 'footer', name: 'Подвал' },
  });

  await prisma.menuItem.deleteMany({ where: { menuId: headerMenu.id } });
  await prisma.menuItem.createMany({
    data: [
      { menuId: headerMenu.id, label: 'Главная', url: '/', order: 0 },
      { menuId: headerMenu.id, label: 'Новости региона', url: '/section/region', order: 1 },
      { menuId: headerMenu.id, label: 'Политика', sectionId: sectionIds.politics, order: 2 },
      { menuId: headerMenu.id, label: 'Общество', sectionId: sectionIds.society, order: 3 },
      { menuId: headerMenu.id, label: 'Спорт', sectionId: sectionIds.sport, order: 4 },
      { menuId: headerMenu.id, label: 'Культура', sectionId: sectionIds.culture, order: 5 },
      { menuId: headerMenu.id, label: 'Экономика', sectionId: sectionIds.economy, order: 6 },
      { menuId: headerMenu.id, label: 'Общие новости', sectionId: sectionIds.general, order: 7 },
    ],
  });

  await prisma.menuItem.deleteMany({ where: { menuId: footerMenu.id } });
  await prisma.menuItem.createMany({
    data: [
      { menuId: footerMenu.id, label: 'О проекте', url: '/about', order: 0 },
      { menuId: footerMenu.id, label: 'Контакты', url: '/contacts', order: 1 },
      { menuId: footerMenu.id, label: 'Реклама', url: '/advertising', order: 2 },
      { menuId: footerMenu.id, label: 'Политика конфиденциальности', url: '/privacy', order: 3 },
      { menuId: footerMenu.id, label: 'Правила использования', url: '/terms', order: 4 },
      { menuId: footerMenu.id, label: 'Редакция', url: '/editorial', order: 5 },
      { menuId: footerMenu.id, label: 'RSS', url: '/rss', order: 6 },
    ],
  });

  const staticPages = [
    { slug: 'about', title: 'О проекте', body: '<p>Информация о проекте и редакции.</p>' },
    { slug: 'contacts', title: 'Контакты', body: '<p>Адрес, телефон, email для связи.</p>' },
    { slug: 'advertising', title: 'Реклама', body: '<p>Условия размещения рекламы.</p>' },
    { slug: 'privacy', title: 'Политика конфиденциальности', body: '<p>Обработка персональных данных и использование cookies.</p>' },
    { slug: 'terms', title: 'Правила использования', body: '<p>Условия использования сайта.</p>' },
    { slug: 'editorial', title: 'Редакция', body: '<p>Состав редакции, как предложить новость.</p>' },
    { slug: 'rss', title: 'RSS', body: '<p>Ссылки на RSS-ленты.</p>' },
  ];
  for (const p of staticPages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: { title: p.title, body: p.body },
      create: { slug: p.slug, title: p.title, body: p.body },
    });
  }

  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
