-- SQL Seed для RSS-источников
-- Добавляет источник ivanovonews.ru в таблицу sources
-- Запуск: psql $DATABASE_URL -f sources-seed.sql

-- Основной источник IvanovoNews
INSERT INTO sources (id, type, url, name, params, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'rss',
    'https://ivanovonews.ru/rss.php',
    'IvanovoNews - Главные новости',
    jsonb_build_object(
        'region', 'Иваново',
        'city', 'Иваново',
        'language', 'ru',
        'timezone', 'Europe/Moscow',
        'updateInterval', 60,
        'websiteUrl', 'https://ivanovonews.ru',
        'description', 'Информационный портал г. Иваново, все новости региона',
        'categories', jsonb_build_array(
            'Интервью',
            'Телепередачи', 
            'Репортажи',
            'Политика',
            'Общество',
            'Спорт',
            'Культура',
            'Экономика',
            'Происшествия'
        ),
        'features', jsonb_build_object(
            'yandexNews', true,
            'yandexTurbo', true,
            'fullText', true,
            'images', true
        )
    ),
    true,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

-- Примечание: для Prisma с CUID используйте ниже
-- Вместо gen_random_uuid() используйте CUID, сгенерированный в приложении
