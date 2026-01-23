-- FORCE DATABASE SCHEMA FIX
-- This will directly add all missing columns and tables

BEGIN;

-- Add missing Article columns with proper error handling
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='status') THEN
        ALTER TABLE "Article" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
        CREATE INDEX "Article_status_idx" ON "Article"("status");
    END IF;
    
    -- Add isFeatured column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='isFeatured') THEN
        ALTER TABLE "Article" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
        CREATE INDEX "Article_isFeatured_idx" ON "Article"("isFeatured");
    END IF;
    
    -- Add logo column to Settings if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Settings' AND column_name='logo') THEN
        ALTER TABLE "Settings" ADD COLUMN "logo" TEXT;
    END IF;
END $$;

-- Create Service table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "features" TEXT[] DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Service table
CREATE INDEX IF NOT EXISTS "Service_isActive_idx" ON "Service"("isActive");
CREATE INDEX IF NOT EXISTS "Service_order_idx" ON "Service"("order");

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

-- Create indexes for Analytics table
CREATE INDEX IF NOT EXISTS "Analytics_type_idx" ON "Analytics"("type");
CREATE INDEX IF NOT EXISTS "Analytics_resourceId_idx" ON "Analytics"("resourceId");
CREATE INDEX IF NOT EXISTS "Analytics_createdAt_idx" ON "Analytics"("createdAt");
CREATE INDEX IF NOT EXISTS "Analytics_path_idx" ON "Analytics"("path");

-- Clean up old problematic columns
ALTER TABLE "Article" DROP COLUMN IF EXISTS "authorId";
DROP INDEX IF EXISTS "Article_authorId_idx";

-- Fix Project table
ALTER TABLE "Project" DROP COLUMN IF EXISTS "technicalSpecs";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "teamCredits";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "awards";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "yearStart";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "yearCompletion";
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completionDate" TIMESTAMP(3);

COMMIT;

-- Verify the fix
SELECT 
    'Article.status' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='status') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'Article.isFeatured' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='isFeatured') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'Settings.logo' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Settings' AND column_name='logo') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'Service table' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Service') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'Analytics table' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Analytics') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;