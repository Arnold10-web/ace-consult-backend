#!/bin/bash

# Railway Auto-Migration Script
# Clean deployment script for fresh database

set -e  # Exit on any error

echo "🚀 Starting Railway deployment post-build tasks..."

# Check if DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found. Skipping migrations."
  exit 1
fi

echo "📊 Database URL found. Proceeding with migrations..."

# Generate Prisma Client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🔌 Checking database connection..."
if ! echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1; then
  echo "⏳ Database not ready. Waiting 10 seconds..."
  sleep 10
  if ! echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1; then
    echo "❌ Database connection failed. Exiting."
    exit 1
  fi
fi

echo "✅ Database connection successful!"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations applied successfully!"

echo "✅ Migration process completed!"

# Seed default data if needed
if [ "$NODE_ENV" = "production" ] && [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "🌱 Seeding default data..."
  
  # Run default admin creation
  npx tsx scripts/createDefaultAdmin.ts 2>/dev/null || echo "⚠️ Admin creation skipped"
  
  # Run default settings creation
  npx tsx scripts/createDefaultSettings.ts 2>/dev/null || echo "⚠️ Settings creation skipped"
  
  # Run category seeding
  npx tsx scripts/seedCategories.ts 2>/dev/null || echo "⚠️ Category seeding skipped"
fi

echo "🎉 Railway deployment post-build tasks completed successfully!"
echo "📝 Summary:"
echo "   - Prisma client generated"
echo "   - Database connection verified"
echo "   - Migrations applied"
if [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "   - Default data seeded"
fi
echo ""
echo "🚀 Application is ready to start!"

# Optional: Warm up the application
if [ "$WARM_UP_ON_DEPLOY" = "true" ]; then
  echo "🔥 Warming up application..."
  sleep 5 && curl -f http://localhost:${PORT:-3000}/health > /dev/null 2>&1 &
fi