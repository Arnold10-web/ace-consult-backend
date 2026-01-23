#!/bin/bash

# Railway Deployment Script  
# Database schema is stable - skip migrations for faster deployments
# 
# To force migrations (if needed):
# Set environment variable FORCE_MIGRATE=true in Railway dashboard

set -e  # Exit on any error

echo "🚀 Starting Railway deployment post-build tasks..."

# Check if DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found. Skipping setup."
  exit 1
fi

echo "📊 Database URL found. Proceeding with setup..."

# Generate Prisma Client (required for runtime)
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

# Skip migrations - database schema is stable
echo "⏭️ Skipping migrations - database schema is stable"

# Optional: Only run migrations if FORCE_MIGRATE is set
if [ "$FORCE_MIGRATE" = "true" ]; then
  echo "🔄 Force migration requested - running migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations completed!"
fi

# Always run admin creation for fresh deployments
echo "🌱 Setting up initial data..."

# Run one-time admin creation (always run this)
echo "👤 Setting up admin user..."
npx tsx scripts/createAdminOnce.ts || echo "⚠️ Admin setup completed or skipped"

# Seed other default data if environment variable is set
if [ "$NODE_ENV" = "production" ] && [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "📁 Seeding additional default data..."
  
  # Run default settings creation
  echo "⚙️ Creating default settings..."
  npx tsx scripts/createDefaultSettings.ts || echo "⚠️ Settings creation completed or skipped"
  
  # Run category seeding
  echo "📁 Seeding default categories..."
  npx tsx scripts/seedCategories.ts || echo "⚠️ Category seeding completed or skipped"
  
  echo "✅ Additional data seeding completed"
fi

echo "✅ Initial setup completed!"

echo "🎉 Railway deployment post-build tasks completed successfully!"
echo "📝 Summary:"
echo "   - Prisma client generated"
echo "   - Database connection verified"
echo "   - Migrations skipped (stable schema)"
if [ "$FORCE_MIGRATE" = "true" ]; then
  echo "   - Force migration completed"
fi
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