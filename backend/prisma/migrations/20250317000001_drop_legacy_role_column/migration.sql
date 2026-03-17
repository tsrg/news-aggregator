-- Ensure default roles exist so we can backfill role_id (idempotent)
INSERT INTO "permissions" ("id", "code", "name")
VALUES
  (gen_random_uuid()::text, 'news', 'Новости'),
  (gen_random_uuid()::text, 'pages', 'Страницы'),
  (gen_random_uuid()::text, 'sections', 'Разделы'),
  (gen_random_uuid()::text, 'menus', 'Меню'),
  (gen_random_uuid()::text, 'sources', 'Источники'),
  (gen_random_uuid()::text, 'users', 'Пользователи'),
  (gen_random_uuid()::text, 'roles', 'Роли'),
  (gen_random_uuid()::text, 'settings', 'Настройки')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "roles" ("id", "name", "slug", "is_full_access", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'Администратор', 'admin', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Редактор', 'editor', false, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r, "permissions" p
WHERE r.slug = 'editor' AND p.code = 'news'
ON CONFLICT DO NOTHING;

-- Backfill role_id from legacy role column
UPDATE "users" u
SET "role_id" = r.id
FROM "roles" r
WHERE r.slug = 'admin' AND u.role = 'ADMIN' AND u.role_id IS NULL;

UPDATE "users" u
SET "role_id" = r.id
FROM "roles" r
WHERE r.slug = 'editor' AND u.role = 'EDITOR' AND u.role_id IS NULL;

UPDATE "users" u
SET "role_id" = (SELECT id FROM "roles" WHERE slug = 'editor' LIMIT 1)
WHERE u.role_id IS NULL;

ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "Role";
