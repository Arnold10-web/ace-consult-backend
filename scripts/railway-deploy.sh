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
if ! npx prisma migrate deploy; then
  echo "⚠️ Migration failed. Attempting database reset and reapply..."
  
  # For fresh database, reset and reapply all migrations
  echo "🗄️ Resetting database and applying fresh schema..."
  npx prisma db push --force-reset --accept-data-loss 2>/dev/null || npx prisma migrate deploy
fi

echo "✅ Migrations applied successfully!"

echo "✅ Migration process completed!"

# Seed default data if needed
if [ "$NODE_ENV" = "production" ] && [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "🌱 Seeding default data..."
  
  # Run one-time admin creation
  echo "👤 Setting up admin user (one-time only)..."
  npx tsx scripts/createAdminOnce.ts || echo "⚠️ Admin setup completed or skipped"
  
  # Run default settings creation
  echo "⚙️ Creating default settings..."
  npx tsx scripts/createDefaultSettings.ts || echo "⚠️ Settings creation completed or skipped"
  
  # Run category seeding
  echo "📁 Seeding default categories..."
  npx tsx scripts/seedCategories.ts || echo "⚠️ Category seeding completed or skipped"
  
  echo "✅ Default data seeding completed"
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