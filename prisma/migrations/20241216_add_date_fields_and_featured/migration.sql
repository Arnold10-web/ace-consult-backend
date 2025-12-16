-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "completionDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- Migrate existing year data to date fields
UPDATE "Project" 
SET "startDate" = CASE 
    WHEN "yearStart" IS NOT NULL THEN MAKE_DATE("yearStart", 1, 1)::TIMESTAMP
    ELSE NULL
END;

UPDATE "Project" 
SET "completionDate" = CASE 
    WHEN "yearCompletion" IS NOT NULL THEN MAKE_DATE("yearCompletion", 12, 31)::TIMESTAMP
    ELSE NULL
END;

-- CreateIndex
CREATE INDEX "Project_startDate_idx" ON "Project"("startDate");

-- Drop old index if it exists
DROP INDEX IF EXISTS "Project_yearStart_idx";