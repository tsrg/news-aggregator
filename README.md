# Агрегатор новостей

Монорепозиторий (npm workspaces): **backend** (Express + Prisma), **frontend** (Nuxt 3), **admin** (Vue 3 + Vite). Публичный сайт, отдельная админ-панель и REST API; фоновые задачи (RSS, парсинг статей, очистка черновиков) через **Redis** и **Bull**.

Подробная логическая спецификация (модель данных, API, потоки): [`SPEC.md`](SPEC.md).

## Возможности

- Импорт из **RSS** и **sitemap**, фильтры по полям источника; периодический опрос (по умолчанию каждые 15 минут).
- Модерация: статусы новости, история версий, объединение дубликатов (при включённых настройках и ИИ).
- **Разделы**, **меню** (в т.ч. иерархия), **статические страницы** CMS.
- **Регионы** (список в настройках), привязка материалов к региону.
- **Правила использования контента по источнику** и юридические проверки перед публикацией.
- **ИИ**: правка текста, фактчек, обложки, обзорные материалы (OpenAI или z.ai; ключи в env или в настройках в БД).
- **RBAC**: роли с полным доступом или набором разрешений (`news`, `sources`, `settings`, …), не только «админ / редактор».
- Загрузки: локальная папка `backend/uploads`, **S3-совместимое хранилище** (в Docker — MinIO) или **CDN API** по настройкам в админке.
- Публичный сайт подписывается на **WebSocket** (Socket.io): события при публикации и обновлении новостей.

## Требования

- **Node.js 20+**
- **PostgreSQL 16** (или совместимая версия)
- **Redis 7** — нужен для очередей (RSS, парсинг тел статьи, почасовая очистка черновиков). Без Redis API поднимается, но планировщик и очереди не стартуют.

## Структура репозитория

```
news-aggregator/
├── backend/          # API, Prisma, jobs, WebSocket
├── frontend/         # Nuxt 3 — публичный сайт
├── admin/            # Vue 3 — панель редактора
├── nginx/            # Пример конфигурации reverse proxy (прод)
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.docker.example
├── SPEC.md
└── LICENSE
```

## Локальная разработка (без Docker)

Из корня можно поставить зависимости во всех пакетах:

```bash
npm install
```

### Backend

```bash
cd backend
cp .env.example .env
# Заполните DATABASE_URL, JWT_SECRET, REDIS_URL=redis://localhost:6379
# ИИ: AI_PROVIDER=openai|zai, OPENAI_API_KEY или ZAI_API_KEY
npm install
npx prisma migrate dev
npx prisma db seed   # пользователи и начальные данные
npm run dev
```

API по умолчанию: **http://localhost:3000**.

Публичные маршруты включают: `/api/health`, `/api/news`, `/api/sections`, `/api/menus`, `/api/pages`, `/api/regions`. Админские: `/api/auth/*`, `/api/admin/*` (сессия через cookie `admin_session` или заголовок `Authorization: Bearer`).

На сайте отображаются только новости со статусом **Опубликовано** (в админке нужно опубликовать материал).

### Frontend (Nuxt 3)

```bash
cd frontend
npm install
# NUXT_PUBLIC_API_BASE=http://localhost:3000 — URL API для браузера
# Для SSR в Docker используется NUXT_API_BASE_SERVER (см. примеры в docker-compose)
npm run dev
```

Локально Nuxt по умолчанию слушает **http://localhost:3000** (если порт занят — другой, см. вывод в терминале). В Docker фронт проброшен на хост как **http://localhost:3001**.

### Admin (Vue 3)

```bash
cd admin
npm install
# VITE_API_BASE_URL=http://localhost:3000
npm run dev
```

Админка по умолчанию: **http://localhost:5174**.

Учётные записи после seed (можно изменить в БД): `admin@example.com` / `admin123` (полный доступ), `editor@example.com` / `editor123` (типично только новости).

### Настройки в админке

- **Основные** — автоудаление старых неопубликованных материалов, объединение дубликатов (задача очистки раз в час, нужен Redis).
- **Хранилище** — MinIO/S3, CDN API или fallback на env / локальную папку (см. [`AGENTS.md`](AGENTS.md)).
- **Регионы**, **ИИ**, **пользователи и роли** — по соответствующим разделам.

## ИИ

В `.env` backend или в **Настройки → ИИ** (значения в БД): провайдер и ключи. На странице новости — панель «Редактирование с помощью ИИ» и связанные действия.

## Docker

Нужны Docker и Docker Compose. В compose поднимаются PostgreSQL, Redis, MinIO, backend, frontend и admin.

### Production

```bash
export JWT_SECRET=your-secret   # обязательно в проде
docker compose up -d --build
```

Порты на хосте (см. `docker-compose.yml`):

| Сервис   | URL (по умолчанию)        |
|----------|---------------------------|
| API      | http://localhost:3002     |
| Сайт     | http://localhost:3001     |
| Админка  | http://localhost:5080     |
| MinIO    | http://localhost:9000 (консоль 9001) |

Первый запуск — миграции и seed (backend должен быть запущен):

```bash
docker compose exec -u root backend npx prisma migrate deploy
docker compose exec -u root backend npx prisma db seed
```

Переменные: см. **`.env.docker.example`** и комментарии в `docker-compose.yml`. Часто задают `JWT_SECRET`, `CORS_ORIGINS`, `NUXT_PUBLIC_API_BASE`, `VITE_API_BASE_URL`, `S3_PUBLIC_BASE_URL`, ключи ИИ. Для админки в `VITE_API_BASE_URL` указывайте **origin API** (например `https://ivanovo.online` при проксировании `/api` на тот же хост), без суффикса `/api`.

### Dev (hot-reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Порты: backend **3002**, frontend **3001**, admin **5174**. Затем миграции и seed — аналогично, с тем же набором файлов compose.

## Nginx (продакшен)

Пример конфигурации для основного сайта, www и поддомена админки — в каталоге [`nginx/`](nginx/README.md).

## Сборка для выкладки

- **Backend:** `cd backend && npm start` (или PM2/systemd).
- **Frontend:** `cd frontend && npm run build` — статика в `.output/public` (см. документацию Nuxt для вашего режима).
- **Admin:** `cd admin && npm run build` — каталог `dist/` за обратным прокси или на поддомене.

## Лицензия

Проект распространяется под **Creative Commons Attribution-NonCommercial 4.0** ([`LICENSE`](LICENSE)): некоммерческое использование с указанием авторства; **коммерческое использование** — только по отдельному согласованию с правообладателем.

