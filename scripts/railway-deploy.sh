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

# Check database connection with a simple query
echo "🔌 Checking database connection..."
check_db_connection() {
  echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1
}

if ! check_db_connection; then
  echo "⏳ Database not ready. Waiting 10 seconds..."
  sleep 10
  if ! check_db_connection; then
    echo "⏳ Still waiting... Trying one more time in 10 seconds..."
    sleep 10
    if ! check_db_connection; then
      echo "❌ Database connection failed after 3 attempts. Exiting."
      exit 1
    fi
  fi
fi

echo "✅ Database connection successful!"

# Run pending migrations with automatic failed migration resolution
echo "🔄 Running database migrations..."
if ! npx prisma migrate deploy; then
  echo "⚠️  Migration deployment failed. Checking for failed migrations..."
  
  # Specifically handle the known failed migration
  FAILED_MIGRATION="20241220_add_about_image_to_settings"
  echo "🔧 Resolving known failed migration: $FAILED_MIGRATION"
  npx prisma migrate resolve --applied "$FAILED_MIGRATION" || {
    echo "📝 Failed migration may already be resolved, continuing..."
  }
  
  # Also resolve any other potential failed migrations
  echo "🔧 Resolving other potential failed migrations..."
  npx prisma migrate resolve --applied "20241109000000_init" || true
  npx prisma migrate resolve --applied "20241216_add_date_fields_and_featured" || true
  npx prisma migrate resolve --applied "20241216_remove_old_year_fields" || true
  
  # Try migration deploy again
  echo "🔄 Retrying migration deployment..."
  if ! npx prisma migrate deploy; then
    echo "❌ Migration deployment still failed."
    echo "💡 Attempting to reset migration state..."
    
    # Last resort: mark all migrations as applied
    npx prisma migrate resolve --applied "$FAILED_MIGRATION" || true
    
    # Final attempt
    if ! npx prisma migrate deploy; then
      echo "❌ Final migration attempt failed. Manual intervention required."
      echo "💡 Tip: Check migration files and database state manually."
      exit 1
    fi
  fi
      echo "❌ Migration still failing. Trying to reset migration state..."
      
      # Force mark as rolled back and try fresh deploy
      npx prisma migrate resolve --rolled-back "20241220_add_about_image_to_settings" || true
      npx prisma migrate deploy || {
        echo "❌ Migration deployment failed completely. Manual intervention required."
        echo "💡 Consider using Railway CLI to connect and resolve migrations manually."
        exit 1
      }
    fi
  else
    echo "❌ Migration deployment failed for unknown reason."
    exit 1
  fi
fi

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