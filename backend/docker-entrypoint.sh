#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  # Не скрывать ошибки: при сбое миграций контейнер не должен стартовать со старой схемой БД.
  npx prisma migrate deploy
fi
# Клиент генерируется при сборке образа. Повторный generate в рантайме не нужен в prod и даёт EACCES,
# если node_modules принадлежит root. Для dev с примонтированным prisma: PRISMA_RUNTIME_GENERATE=1
if [ -n "$PRISMA_RUNTIME_GENERATE" ]; then
  npx prisma generate
fi
exec "$@"
