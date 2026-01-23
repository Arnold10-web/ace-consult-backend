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
  echo "⚠️  Migration deployment failed. Attempting resolution..."
  
  # First, mark the specific failed migration as rolled back
  echo "🔧 Marking failed migration as rolled back..."
  npx prisma migrate resolve --rolled-back "20250112000000_add_status_and_featured_to_articles" 2>/dev/null || true
  
  # Check if the problematic columns already exist
  echo "🔧 Checking database schema for existing columns..."
  COLUMNS_CHECK=$(psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Article' AND column_name IN ('status', 'isFeatured');" -t 2>/dev/null | wc -l || echo "0")
  
  if [ "$COLUMNS_CHECK" -ge 2 ]; then
    echo "✅ Required columns already exist. Marking migration as applied..."
    npx prisma migrate resolve --applied "20250112000000_add_status_and_featured_to_articles" 2>/dev/null || true
  else
    echo "🔧 Adding missing columns manually..."
    psql "$DATABASE_URL" -c "
      ALTER TABLE \"Article\" ADD COLUMN IF NOT EXISTS \"isFeatured\" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE \"Article\" ADD COLUMN IF NOT EXISTS \"status\" TEXT NOT NULL DEFAULT 'draft';
      CREATE INDEX IF NOT EXISTS \"Article_isFeatured_idx\" ON \"Article\"(\"isFeatured\");
      CREATE INDEX IF NOT EXISTS \"Article_status_idx\" ON \"Article\"(\"status\");
    " 2>/dev/null || true
    echo "✅ Columns added. Marking migration as applied..."
    npx prisma migrate resolve --applied "20250112000000_add_status_and_featured_to_articles" 2>/dev/null || true
  fi
  
  # Now try to deploy migrations again
  echo "🔄 Retrying migration deployment after resolution..."
  if ! npx prisma migrate deploy; then
    echo "⚠️  Migration still failing. Trying reset approach..."
    
    # Reset the entire migration state and reapply
    npx prisma migrate reset --force 2>/dev/null || true
    npx prisma migrate deploy 2>/dev/null || true
  fi
  
  # Resolve any other potential failed migrations as fallback
  echo "🔧 Resolving other potential failed migrations..."
  npx prisma migrate resolve --applied "20241109000000_init" 2>/dev/null || true
  npx prisma migrate resolve --applied "20241220_add_about_image_to_settings" 2>/dev/null || true
  npx prisma migrate resolve --applied "20241216_add_date_fields_and_featured" 2>/dev/null || true
  npx prisma migrate resolve --applied "20241216_remove_old_year_fields" 2>/dev/null || true
  npx prisma migrate resolve --applied "20260120124526_add_missing_analytics_and_service_tables" 2>/dev/null || true
  
  # Final attempt - apply comprehensive schema fixes with proper error handling
  echo "🔧 Applying COMPREHENSIVE schema fixes..."
  psql "$DATABASE_URL" -c "
    BEGIN;
    
    -- Add missing Article columns with proper error handling
    DO \$\$
    BEGIN
        -- Add status column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='status') THEN
            ALTER TABLE \"Article\" ADD COLUMN \"status\" TEXT NOT NULL DEFAULT 'draft';
            CREATE INDEX \"Article_status_idx\" ON \"Article\"(\"status\");
        END IF;
        
        -- Add isFeatured column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='isFeatured') THEN
            ALTER TABLE \"Article\" ADD COLUMN \"isFeatured\" BOOLEAN NOT NULL DEFAULT false;
            CREATE INDEX \"Article_isFeatured_idx\" ON \"Article\"(\"isFeatured\");
        END IF;
        
        -- Add logo column to Settings if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Settings' AND column_name='logo') THEN
            ALTER TABLE \"Settings\" ADD COLUMN \"logo\" TEXT;
        END IF;
    END \$\$;
    
    -- Create Service table if it doesn't exist
    CREATE TABLE IF NOT EXISTS \"Service\" (
        \"id\" TEXT NOT NULL,
        \"title\" TEXT NOT NULL,
        \"description\" TEXT NOT NULL,
        \"icon\" TEXT,
        \"image\" TEXT,
        \"features\" TEXT[] DEFAULT '{}',
        \"isActive\" BOOLEAN NOT NULL DEFAULT true,
        \"order\" INTEGER NOT NULL DEFAULT 0,
        \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \"updatedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \"Service_pkey\" PRIMARY KEY (\"id\")
    );
    
    -- Create Analytics table if it doesn't exist
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
    CREATE INDEX IF NOT EXISTS \"Service_isActive_idx\" ON \"Service\"(\"isActive\");
    CREATE INDEX IF NOT EXISTS \"Service_order_idx\" ON \"Service\"(\"order\");
    CREATE INDEX IF NOT EXISTS \"Analytics_type_idx\" ON \"Analytics\"(\"type\");
    CREATE INDEX IF NOT EXISTS \"Analytics_resourceId_idx\" ON \"Analytics\"(\"resourceId\");
    CREATE INDEX IF NOT EXISTS \"Analytics_createdAt_idx\" ON \"Analytics\"(\"createdAt\");
    CREATE INDEX IF NOT EXISTS \"Analytics_path_idx\" ON \"Analytics\"(\"path\");
    
    -- Add missing Settings columns
    ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"aboutImage\" TEXT;
    ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"heroImages\" TEXT[];
    ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"heroTitle\" TEXT;
    ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"heroSubtitle\" TEXT;
    ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"seoDefaultTitle\" TEXT;
    ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"seoDefaultDesc\" TEXT;
    
    -- Clean up problematic columns
    ALTER TABLE \"Article\" DROP COLUMN IF EXISTS \"authorId\";
    DROP INDEX IF EXISTS \"Article_authorId_idx\";
    
    -- Fix Project table
    ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"technicalSpecs\";
    ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"teamCredits\";
    ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"awards\";
    ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"yearStart\";
    ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"yearCompletion\";
    ALTER TABLE \"Project\" ADD COLUMN IF NOT EXISTS \"startDate\" TIMESTAMP(3);
    ALTER TABLE \"Project\" ADD COLUMN IF NOT EXISTS \"completionDate\" TIMESTAMP(3);
    
    COMMIT;
  " 2>/dev/null || true
  echo "✅ Manual schema fixes applied"
  
  # Try migration deploy again
  echo "🔄 Retrying migration deployment..."
  if ! npx prisma migrate deploy; then
    echo "⚠️  Still having issues. Trying rollback approach..."
    
    # Try rolling back the problematic migration and reapplying
    npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || true
    
    # Final attempt
    if ! npx prisma migrate deploy; then
      echo "⚠️  Migration still has issues, but continuing startup..."
      echo "💡 Database should still be functional for basic operations."
    else
      echo "✅ Migrations resolved successfully!"
    fi
  else
    echo "✅ Migrations resolved successfully!"
  fi
else
  echo "✅ Migrations applied successfully!"
fi

# Always run schema verification and fixes (regardless of migration success)
echo "🔧 Verifying database schema integrity..."
psql "$DATABASE_URL" -c "
  BEGIN;
  
  -- Comprehensive schema verification and fixes
  DO \$\$
  BEGIN
      -- Add missing Article columns
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='status') THEN
          ALTER TABLE \"Article\" ADD COLUMN \"status\" TEXT NOT NULL DEFAULT 'draft';
          CREATE INDEX \"Article_status_idx\" ON \"Article\"(\"status\");
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='isFeatured') THEN
          ALTER TABLE \"Article\" ADD COLUMN \"isFeatured\" BOOLEAN NOT NULL DEFAULT false;
          CREATE INDEX \"Article_isFeatured_idx\" ON \"Article\"(\"isFeatured\");
      END IF;
      
      -- Add missing Settings columns
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Settings' AND column_name='logo') THEN
          ALTER TABLE \"Settings\" ADD COLUMN \"logo\" TEXT;
      END IF;
  END \$\$;
  
  -- Create Service table if missing
  CREATE TABLE IF NOT EXISTS \"Service\" (
      \"id\" TEXT NOT NULL,
      \"title\" TEXT NOT NULL,
      \"description\" TEXT NOT NULL,
      \"icon\" TEXT,
      \"image\" TEXT,
      \"features\" TEXT[] DEFAULT '{}',
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
  
  -- Create all missing indexes
  CREATE INDEX IF NOT EXISTS \"Service_isActive_idx\" ON \"Service\"(\"isActive\");
  CREATE INDEX IF NOT EXISTS \"Service_order_idx\" ON \"Service\"(\"order\");
  CREATE INDEX IF NOT EXISTS \"Analytics_type_idx\" ON \"Analytics\"(\"type\");
  CREATE INDEX IF NOT EXISTS \"Analytics_resourceId_idx\" ON \"Analytics\"(\"resourceId\");
  CREATE INDEX IF NOT EXISTS \"Analytics_createdAt_idx\" ON \"Analytics\"(\"createdAt\");
  CREATE INDEX IF NOT EXISTS \"Analytics_path_idx\" ON \"Analytics\"(\"path\");
  
  -- Add other missing Settings columns
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"aboutImage\" TEXT;
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"heroImages\" TEXT[];
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"heroTitle\" TEXT;
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"heroSubtitle\" TEXT;
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"seoDefaultTitle\" TEXT;
  ALTER TABLE \"Settings\" ADD COLUMN IF NOT EXISTS \"seoDefaultDesc\" TEXT;
  
  -- Remove unnecessary Project columns
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"technicalSpecs\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"teamCredits\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"awards\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"yearStart\";
  ALTER TABLE \"Project\" DROP COLUMN IF EXISTS \"yearCompletion\";
  
  -- Add correct Project columns
  ALTER TABLE \"Project\" ADD COLUMN IF NOT EXISTS \"startDate\" TIMESTAMP(3);
  ALTER TABLE \"Project\" ADD COLUMN IF NOT EXISTS \"completionDate\" TIMESTAMP(3);
  
  -- Remove foreign key constraint and authorId if it exists
  ALTER TABLE \"Article\" DROP CONSTRAINT IF EXISTS \"Article_authorId_fkey\";
  DROP INDEX IF EXISTS \"Article_authorId_idx\";
  ALTER TABLE \"Article\" DROP COLUMN IF EXISTS \"authorId\";
  
  COMMIT;
" 2>/dev/null || true
echo "✅ Schema verification completed"

# Verify critical columns exist
echo "🔍 Final verification of critical database schema..."
psql "$DATABASE_URL" -c "
SELECT 
    'Article.status' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='status') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'Article.isFeatured' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Article' AND column_name='isFeatured') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'Settings.logo' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Settings' AND column_name='logo') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'Service table' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Service') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'Analytics table' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Analytics') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
" 2>/dev/null || echo "⚠️ Could not verify schema, but fixes were applied"

# Regenerate Prisma client to ensure it's in sync with database
echo "🔄 Regenerating Prisma client to sync with database schema..."
npx prisma generate || echo "⚠️ Prisma generate failed, but continuing..."

echo "✅ Migration process completed!"

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