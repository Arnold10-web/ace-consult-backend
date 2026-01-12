-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- CreateIndex
CREATE INDEX "Article_isFeatured_idx" ON "Article"("isFeatured");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");