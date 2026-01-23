#!/bin/bash

# Manual Database Fix Script
# Use this if you have direct access to the DATABASE_URL

echo "🔧 Manual database fix script"
echo "❗ This script requires your production DATABASE_URL"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo ""
  echo "To use this script:"
  echo "1. Get your DATABASE_URL from Railway dashboard"
  echo "2. Run: export DATABASE_URL='your-database-url-here'"
  echo "3. Run this script again"
  echo ""
  echo "Or run with DATABASE_URL inline:"
  echo "DATABASE_URL='your-url' ./manual-db-fix.sh"
  exit 1
fi

echo "✅ DATABASE_URL found, proceeding with fix..."

cd backend

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Test database connection
echo "🔌 Testing database connection..."
if ! echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1; then
  echo "❌ Database connection failed"
  echo "Please check your DATABASE_URL is correct"
  exit 1
fi

echo "✅ Database connection successful"

# Apply the comprehensive fix
echo "🔨 Applying comprehensive database fix..."
npx prisma db execute --stdin < fix-missing-columns.sql

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

# Deploy remaining migrations
echo "🚀 Deploying any remaining migrations..."
npx prisma migrate deploy

# Verify fix
echo "🔍 Verifying database schema..."
psql "$DATABASE_URL" -c "
SELECT 
  'Article' as table_name,
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'Article' 
  AND column_name IN ('status', 'isFeatured')
UNION ALL
SELECT 
  'Settings' as table_name,
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'Settings' 
  AND column_name = 'logo'
UNION ALL
SELECT 
  'Service' as table_name,
  'table_exists' as column_name,
  'boolean' as data_type
FROM information_schema.tables 
WHERE table_name = 'Service'
ORDER BY table_name, column_name;
"

echo ""
echo "✨ Database fix completed!"
echo "🔄 Please restart your Railway application now"
echo ""
echo "🎯 You should now be able to:"
echo "   - Login to admin dashboard"
echo "   - Upload content (projects, articles, team members)"
echo "   - View analytics dashboard"