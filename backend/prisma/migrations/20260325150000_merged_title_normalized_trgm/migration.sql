CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TYPE "NewsStatus" ADD VALUE 'MERGED';

ALTER TABLE "news_items" ADD COLUMN "title_normalized" TEXT;

UPDATE "news_items"
SET "title_normalized" = TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(COALESCE("title", '')),
        '[«»"''""„…]',
        ' ',
        'g'
      ),
      '[^а-яёА-ЯЁa-zA-Z0-9\s]',
      ' ',
      'g'
    ),
    '\s+',
    ' ',
    'g'
  )
);

CREATE INDEX "news_items_title_normalized_trgm_idx" ON "news_items" USING gin ("title_normalized" gin_trgm_ops);
