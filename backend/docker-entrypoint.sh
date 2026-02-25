#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy 2>/dev/null || true
fi
exec "$@"
