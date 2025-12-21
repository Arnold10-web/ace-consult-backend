#!/bin/bash

# Manual Migration Fix Script for Railway
# This script resolves the specific failed migration issue

set -e

echo "🔧 Manual Migration Fix for Railway..."
echo "📋 Targeting failed migration: 20241220_add_about_image_to_settings"

# Check if we're in production/Railway environment
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found. This script is for Railway deployment only."
  exit 1
fi

echo "🔌 Generating Prisma client..."
npx prisma generate

echo "🔍 Checking current migration status..."
npx prisma migrate status || true

echo "✅ Marking failed migration as applied (manual hotfix approach)..."
npx prisma migrate resolve --applied "20241220_add_about_image_to_settings"

echo "🔄 Deploying any remaining migrations..."
npx prisma migrate deploy

echo "✅ Migration fix completed!"
echo "🚀 Backend should now be ready to serve API requests."