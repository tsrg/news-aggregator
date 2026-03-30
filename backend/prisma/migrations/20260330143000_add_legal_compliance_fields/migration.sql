-- CreateEnum
CREATE TYPE "ContentClass" AS ENUM ('NEWS', 'REPORT', 'ANALYSIS', 'OPINION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LegalReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "news_items"
ADD COLUMN "content_class" "ContentClass" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "confirmed_facts" JSONB,
ADD COLUMN "differences" JSONB,
ADD COLUMN "legal_review_notes" TEXT,
ADD COLUMN "legal_review_status" "LegalReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "source_usage_rules"
ADD COLUMN "allow_analytical_reuse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "content_class_default" "ContentClass" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "requires_direct_link_at_top" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requires_manual_approval_for_analytical" BOOLEAN NOT NULL DEFAULT true;
