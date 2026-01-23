#!/bin/bash

# Quick fix script for Railway - Run this in Railway shell
# railway run bash quick-fix-railway.sh

set -e

echo "🔧 Quick fix for missing database columns..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Apply manual SQL fixes first
echo "🔨 Applying schema fixes..."
psql "$DATABASE_URL" -c "
  -- Add missing Article columns
  ALTER TABLE \"Article\" ADD COLUMN IF NOT EXISTS \"status\" TEXT NOT NULL DEFAULT 'draft';
  ALTER TABLE \"Article\" ADD COLUMN IF NOT EXISTS \"isFeatured\" BOOLEAN NOT NULL DEFAULT false;
  
  -- Add missing Settings column
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"logo\" TEXT;
  
  -- Create missing indexes
  CREATE INDEX IF NOT EXISTS \"Article_status_idx\" ON \"Article\"(\"status\");
  CREATE INDEX IF NOT EXISTS \"Article_isFeatured_idx\" ON \"Article\"(\"isFeatured\");
"

echo "✅ Schema fixes applied!"

# Mark migrations as applied
echo "📝 Updating migration history..."
npx prisma migrate resolve --applied 20250112000000_add_status_and_featured_to_articles 2>/dev/null || true
npx prisma migrate resolve --applied 20260123_add_logo_to_settings 2>/dev/null || true

# Deploy any remaining migrations
echo "🚀 Deploying remaining migrations..."
npx prisma migrate deploy || true

echo "✨ Fix complete! Please restart your application."
