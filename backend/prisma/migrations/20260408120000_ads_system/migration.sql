-- CreateEnum
CREATE TYPE "AdCreativeType" AS ENUM ('BANNER', 'YANDEX_RTB');

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_placements_code_key" ON "ad_placements"("code");

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "type" "AdCreativeType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "image_url" TEXT,
    "target_url" TEXT,
    "open_in_new_tab" BOOLEAN NOT NULL DEFAULT true,
    "alt_text" TEXT,
    "yandex_config" JSONB,
    "erid" TEXT,
    "advertiser_name" TEXT,
    "advertiser_inn" TEXT,
    "advertiser_ogrn" TEXT,
    "internal_registry_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_creatives_internal_registry_id_key" ON "ad_creatives"("internal_registry_id");

CREATE INDEX "ad_creatives_placement_id_sort_order_idx" ON "ad_creatives"("placement_id", "sort_order");

ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "ad_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "news_items" ADD COLUMN "is_promotional" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "news_items" ADD COLUMN "promo_erid" TEXT;
ALTER TABLE "news_items" ADD COLUMN "promo_advertiser_name" TEXT;
ALTER TABLE "news_items" ADD COLUMN "promo_advertiser_inn" TEXT;
ALTER TABLE "news_items" ADD COLUMN "promo_advertiser_ogrn" TEXT;
