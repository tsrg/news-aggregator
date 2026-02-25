# Агрегатор новостей

Монорепозиторий: backend (Express), frontend (Nuxt 3), admin (Vue 3 + Vite).

## Требования

- Node.js 20+
- PostgreSQL
- Redis (для очередей Bull, опционально на старте)

## Backend

```bash
cd backend
cp .env.example .env
# Заполните DATABASE_URL, JWT_SECRET. Для ИИ: OPENAI_API_KEY или ZAI_API_KEY, AI_PROVIDER=openai|zai
npm install
npx prisma migrate dev   # создание таблиц
npx prisma db seed       # админ admin@example.com / admin123, редактор editor@example.com / editor123
npm run dev
```

API: `http://localhost:3000`. Публичные эндпоинты: `/api/news`, `/api/sections`, `/api/menus/:key`, `/api/pages/:slug`. Админ: `/api/auth/login`, `/api/admin/*` (JWT).

## Frontend (Nuxt 3)

```bash
cd frontend
npm install
# Создайте .env или задайте NUXT_PUBLIC_API_BASE=http://localhost:3000
npm run dev
```

Сайт: `http://localhost:3001` (или порт из Nuxt).

## Admin (Vue 3)

```bash
cd admin
npm install
# Опционально .env: VITE_API_BASE_URL=http://localhost:3000
npm run dev
```

Админка: `http://localhost:5174`. Вход: admin@example.com / admin123 (полный доступ), editor@example.com / editor123 (только новости).

## ИИ (проверка фактов и редактирование)

В `.env` backend: `AI_PROVIDER=openai`, `OPENAI_API_KEY=sk-...`. Для z.ai: `AI_PROVIDER=zai`, `ZAI_API_KEY=...`. На странице редактирования новости в админке доступна панель «Редактирование с помощью ИИ».

## Деплой

- Backend: `npm start` (или PM2/systemd).
- Frontend: `npm run build` затем `npm run preview` или раздача `output/public` (SSG).
- Admin: `npm run build`, раздача `dist/` по пути `/admin` или поддомену.

## Docker (dev и production)

Требования: Docker и Docker Compose.

### Production

```bash
# Из корня проекта
export JWT_SECRET=your-secret   # обязательно в проде
docker compose up -d --build
```

- API: http://localhost:3000  
- Сайт: http://localhost:3001  
- Админка: порт назначается автоматически. После `up` выполните:
  `docker compose port admin 80` (prod) или `docker compose -f docker-compose.yml -f docker-compose.dev.yml port admin 5174` (dev) — в выводе будет хост:порт, откройте http://localhost:ПОРТ  

Первый запуск: применить миграции и seed (пока backend уже поднят):

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

Переменные окружения (можно задать в `.env` в корне или передать в `docker compose`): `JWT_SECRET`, `CORS_ORIGINS`, `NUXT_PUBLIC_API_BASE`, `VITE_API_BASE_URL`, `AI_PROVIDER`, `OPENAI_API_KEY`, `ZAI_API_KEY`. Пример: `.env.docker.example`.

### Dev-окружение (с hot-reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

После первого запуска один раз выполните миграции и seed в контейнере backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npx prisma db seed
```

Порты: API 3000, сайт 3001. Админка — случайный порт, см. выше.

## Инициализация репозитория и публикация

Из корня проекта в терминале:

```bash
git init
git add .
git commit -m "Initial commit: news aggregator (Express, Nuxt 3, Vue 3 admin)"
git branch -M main
```

**Публикация на GitHub:**

1. Создайте пустой репозиторий на [github.com/new](https://github.com/new) (без README и .gitignore).
2. Подключите remote и отправьте код:

```bash
git remote add origin https://github.com/VASH_LOGIN/news-aggregator.git
git push -u origin main
```

Либо с [GitHub CLI](https://cli.github.com/):

```bash
gh repo create news-aggregator --private --source=. --push
# или --public для публичного репозитория
```

