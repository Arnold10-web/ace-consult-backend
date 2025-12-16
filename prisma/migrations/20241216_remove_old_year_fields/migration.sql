-- Remove old year columns that are no longer needed
-- First make them optional to avoid constraint issues
ALTER TABLE "Project" ALTER COLUMN "yearStart" DROP NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "yearCompletion" DROP NOT NULL;

-- Then drop the columns completely
ALTER TABLE "Project" DROP COLUMN IF EXISTS "yearStart";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "yearCompletion";