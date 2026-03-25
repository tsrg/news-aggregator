-- AlterTable
ALTER TABLE "news_items" ADD COLUMN "merged_into_id" TEXT,
ADD COLUMN "source_snapshots" JSONB;

-- CreateIndex
CREATE INDEX "news_items_merged_into_id_idx" ON "news_items"("merged_into_id");

-- AddForeignKey
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "news_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
