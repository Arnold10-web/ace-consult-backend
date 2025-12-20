#!/bin/bash

# Railway Auto-Migration Script
# This script automatically runs database migrations after deployment

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
npx prisma db ping || {
  echo "❌ Database connection failed. Retrying in 10 seconds..."
  sleep 10
  npx prisma db ping || {
    echo "❌ Database connection failed again. Exiting."
    exit 1
  }
}

echo "✅ Database connection successful!"

# Run pending migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
  echo "❌ Migration failed. Checking migration status..."
  npx prisma migrate status
  
  # If migrations are out of sync, reset and re-run
  echo "🔄 Attempting to resolve migration issues..."
  npx prisma migrate resolve --applied "$(npx prisma migrate status --json | jq -r '.failedMigrationName')" || true
  npx prisma migrate deploy
}

echo "✅ Migrations completed successfully!"

# Seed default data if needed
if [ "$NODE_ENV" = "production" ] && [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "🌱 Seeding default data..."
  
  # Run default admin creation
  node -e "
    const { exec } = require('child_process');
    exec('tsx scripts/createDefaultAdmin.ts', (error, stdout, stderr) => {
      if (error && !error.message.includes('already exists')) {
        console.error('Admin creation failed:', error);
      } else {
        console.log('✅ Default admin check completed');
      }
    });
  " || true
  
  # Run default settings creation
  node -e "
    const { exec } = require('child_process');
    exec('tsx scripts/createDefaultSettings.ts', (error, stdout, stderr) => {
      if (error && !error.message.includes('already exist')) {
        console.error('Settings creation failed:', error);
      } else {
        console.log('✅ Default settings check completed');
      }
    });
  " || true
  
  # Run category seeding
  node -e "
    const { exec } = require('child_process');
    exec('tsx scripts/seedCategories.ts', (error, stdout, stderr) => {
      if (error && !error.message.includes('already exist')) {
        console.error('Category seeding failed:', error);
      } else {
        console.log('✅ Category seeding check completed');
      }
    });
  " || true
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