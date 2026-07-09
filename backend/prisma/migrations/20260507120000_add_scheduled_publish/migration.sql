-- AlterEnum
ALTER TYPE "NewsStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "news_items" ADD COLUMN "scheduled_publish_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "news_items_status_scheduled_publish_at_idx" ON "news_items"("status", "scheduled_publish_at");
