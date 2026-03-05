-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('INCLUDE', 'EXCLUDE');

-- CreateTable
CREATE TABLE "source_filters" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "type" "FilterType" NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "source_filters_source_id_idx" ON "source_filters"("source_id");

-- AddForeignKey
ALTER TABLE "source_filters" ADD CONSTRAINT "source_filters_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
