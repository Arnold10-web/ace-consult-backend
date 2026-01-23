-- Fix missing columns in database
-- Run this script on your production database to resolve schema mismatch errors

BEGIN;

-- Add missing 'status' and 'isFeatured' columns to Article table
ALTER TABLE "Article" 
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Add missing 'logo' column to Settings table
ALTER TABLE "Settings" 
  ADD COLUMN IF NOT EXISTS "logo" TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Article_isFeatured_idx" ON "Article"("isFeatured");
CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status");

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
