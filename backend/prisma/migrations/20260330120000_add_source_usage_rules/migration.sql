-- CreateTable
CREATE TABLE "source_usage_rules" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "rewrite_instructions" TEXT,
    "quote_limit_percent" INTEGER NOT NULL DEFAULT 20,
    "require_attribution" BOOLEAN NOT NULL DEFAULT true,
    "forbid_verbatim_copy" BOOLEAN NOT NULL DEFAULT true,
    "allow_merge" BOOLEAN NOT NULL DEFAULT true,
    "merge_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_usage_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_usage_rules_source_id_key" ON "source_usage_rules"("source_id");

-- AddForeignKey
ALTER TABLE "source_usage_rules"
ADD CONSTRAINT "source_usage_rules_source_id_fkey"
FOREIGN KEY ("source_id") REFERENCES "sources"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
