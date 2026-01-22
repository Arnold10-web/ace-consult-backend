-- DropForeignKey
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_authorId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Article_authorId_idx";

-- AlterTable
ALTER TABLE "Article" DROP COLUMN IF EXISTS "authorId";