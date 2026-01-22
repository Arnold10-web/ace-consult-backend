-- Manual fix for article table to remove author relationship
-- This addresses the remaining schema issues after migration problems

-- Remove foreign key constraint if it exists
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_authorId_fkey";

-- Remove index if it exists  
DROP INDEX IF EXISTS "Article_authorId_idx";

-- Remove the authorId column if it exists
ALTER TABLE "Article" DROP COLUMN IF EXISTS "authorId";