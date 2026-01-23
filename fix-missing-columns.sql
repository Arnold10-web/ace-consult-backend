-- Fix missing columns and tables in database
-- Run this script on your production database to resolve schema mismatch errors

BEGIN;

-- Add missing 'status' and 'isFeatured' columns to Article table
ALTER TABLE "Article" 
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Add missing 'logo' column to Settings table
ALTER TABLE "Settings" 
  ADD COLUMN IF NOT EXISTS "logo" TEXT;

-- Create Service table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- Create Analytics table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Analytics" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "path" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Article_isFeatured_idx" ON "Article"("isFeatured");
CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status");
CREATE INDEX IF NOT EXISTS "Service_isActive_idx" ON "Service"("isActive");
CREATE INDEX IF NOT EXISTS "Service_order_idx" ON "Service"("order");
CREATE INDEX IF NOT EXISTS "Analytics_type_idx" ON "Analytics"("type");
CREATE INDEX IF NOT EXISTS "Analytics_resourceId_idx" ON "Analytics"("resourceId");
CREATE INDEX IF NOT EXISTS "Analytics_createdAt_idx" ON "Analytics"("createdAt");
CREATE INDEX IF NOT EXISTS "Analytics_path_idx" ON "Analytics"("path");

-- Remove old columns that might cause issues
ALTER TABLE "Article" DROP COLUMN IF EXISTS "authorId";
DROP INDEX IF EXISTS "Article_authorId_idx";

-- Remove old Project columns
ALTER TABLE "Project" DROP COLUMN IF EXISTS "technicalSpecs";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "teamCredits";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "awards";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "yearStart";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "yearCompletion";

-- Add missing Project columns
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completionDate" TIMESTAMP(3);

COMMIT;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Article' 
  AND column_name IN ('status', 'isFeatured')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Settings' 
  AND column_name = 'logo';
