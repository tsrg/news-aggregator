-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "daily_digests" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DigestStatus" NOT NULL DEFAULT 'PENDING',
    "news_item_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "news_count" INTEGER NOT NULL DEFAULT 0,
    "sections" JSONB,
    "article_title" TEXT,
    "article_body" TEXT,
    "article_summary" TEXT,
    "podcast_prompt" TEXT,
    "podcast_script" JSONB,
    "podcast_topics" JSONB,
    "podcast_duration" INTEGER,
    "podcast_voice_style" TEXT,
    "podcast_soundscape_prompt" TEXT,
    "error_message" TEXT,
    "ai_provider" TEXT,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_digests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_digests_date_key" ON "daily_digests"("date");

-- CreateIndex
CREATE INDEX "daily_digests_date_idx" ON "daily_digests"("date");
