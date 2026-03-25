#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  # Не скрывать ошибки: при сбое миграций контейнер не должен стартовать со старой схемой БД.
  npx prisma migrate deploy
fi
# После смены schema.prisma (в т.ч. volume в dev) нужен свежий клиент; иначе Prisma не знает новые поля.
npx prisma generate
exec "$@"
