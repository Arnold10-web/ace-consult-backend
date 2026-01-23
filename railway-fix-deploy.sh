#!/bin/bash

# Railway deployment script with database migration fix
# This ensures all migrations are applied before starting the server

set -e

echo "🚂 Starting Railway deployment with database fixes..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

# Deploy all pending migrations
echo "🗄️ Applying database migrations..."
npx prisma migrate deploy

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Deployment preparation complete!"
echo "Server will start automatically..."
