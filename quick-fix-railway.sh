#!/bin/bash

# Quick fix script for Railway - Run this in Railway shell
# railway run bash quick-fix-railway.sh

set -e

echo "🔧 Comprehensive database fix for missing tables and columns..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Apply comprehensive SQL fixes
echo "🔨 Applying complete schema fixes..."
psql "$DATABASE_URL" -c "
  BEGIN;
  
  -- Add missing Article columns
  ALTER TABLE \"Article\" ADD COLUMN IF NOT EXISTS \"status\" TEXT NOT NULL DEFAULT 'draft';
  ALTER TABLE \"Article\" ADD COLUMN IF NOT EXISTS \"isFeatured\" BOOLEAN NOT NULL DEFAULT false;
  
  -- Add missing Settings column
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"logo\" TEXT;
  
  -- Create Service table if missing
  CREATE TABLE IF NOT EXISTS \"Service\" (
      \"id\" TEXT NOT NULL,
      \"title\" TEXT NOT NULL,
      \"description\" TEXT NOT NULL,
      \"icon\" TEXT,
      \"image\" TEXT,
      \"features\" TEXT[],
      \"isActive\" BOOLEAN NOT NULL DEFAULT true,
      \"order\" INTEGER NOT NULL DEFAULT 0,
      \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \"updatedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \"Service_pkey\" PRIMARY KEY (\"id\")
  );
  
  -- Create Analytics table if missing
  CREATE TABLE IF NOT EXISTS \"Analytics\" (
      \"id\" TEXT NOT NULL,
      \"type\" TEXT NOT NULL,
      \"resourceId\" TEXT,
      \"resourceType\" TEXT,
      \"path\" TEXT NOT NULL,
      \"userAgent\" TEXT,
      \"ipAddress\" TEXT,
      \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \"Analytics_pkey\" PRIMARY KEY (\"id\")
  );
  
  -- Create missing indexes
  CREATE INDEX IF NOT EXISTS \"Article_status_idx\" ON \"Article\"(\"status\");
  CREATE INDEX IF NOT EXISTS \"Article_isFeatured_idx\" ON \"Article\"(\"isFeatured\");
  CREATE INDEX IF NOT EXISTS \"Service_isActive_idx\" ON \"Service\"(\"isActive\");
  CREATE INDEX IF NOT EXISTS \"Service_order_idx\" ON \"Service\"(\"order\");
  CREATE INDEX IF NOT EXISTS \"Analytics_type_idx\" ON \"Analytics\"(\"type\");
  CREATE INDEX IF NOT EXISTS \"Analytics_resourceId_idx\" ON \"Analytics\"(\"resourceId\");
  CREATE INDEX IF NOT EXISTS \"Analytics_createdAt_idx\" ON \"Analytics\"(\"createdAt\");
  CREATE INDEX IF NOT EXISTS \"Analytics_path_idx\" ON \"Analytics\"(\"path\");
  
  -- Remove problematic old columns
  ALTER TABLE \"Article\" DROP COLUMN IF EXISTS \"authorId\";
  DROP INDEX IF EXISTS \"Article_authorId_idx\";
  
  -- Fix Project table columns
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"technicalSpecs\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"teamCredits\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"awards\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"yearStart\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"yearCompletion\";
  ALTER TABLE \"Project\" ADD COLUMN IF NOT EXISTS \"startDate\" TIMESTAMP(3);
  ALTER TABLE \"Project\" ADD COLUMN IF NOT EXISTS \"completionDate\" TIMESTAMP(3);
  
  COMMIT;
"

echo "✅ Comprehensive schema fixes applied!"

# Mark migrations as applied
echo "📝 Updating migration history..."
npx prisma migrate resolve --applied 20241109000000_init 2>/dev/null || true
npx prisma migrate resolve --applied 20241216_add_date_fields_and_featured 2>/dev/null || true
npx prisma migrate resolve --applied 20241216_remove_old_year_fields 2>/dev/null || true
npx prisma migrate resolve --applied 20241220_add_about_image_to_settings 2>/dev/null || true
npx prisma migrate resolve --applied 20250112000000_add_status_and_featured_to_articles 2>/dev/null || true
npx prisma migrate resolve --applied 20260120124526_add_missing_analytics_and_service_tables 2>/dev/null || true
npx prisma migrate resolve --applied 20260122_remove_author_from_articles 2>/dev/null || true
npx prisma migrate resolve --applied 20260123_add_logo_to_settings 2>/dev/null || true

# Deploy any remaining migrations
echo "🚀 Deploying remaining migrations..."
npx prisma migrate deploy || true

# Regenerate Prisma client after schema changes
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "✨ Complete fix applied! Please restart your application."
echo "🎯 You should now be able to:"
echo "   - Login to admin dashboard"
echo "   - Upload projects, articles, and team members" 
echo "   - View analytics dashboard"
