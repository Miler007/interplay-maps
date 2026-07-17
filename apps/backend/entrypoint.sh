#!/bin/sh
set -e

echo "⏳ Waiting for database..."
DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\(.*\):.*/\1/')
DB_USER=$(echo $DATABASE_URL | sed 's/.*:\/\/\(.*\):.*/\1/')
until pg_isready -h "$DB_HOST" -U "$DB_USER" 2>/dev/null; do
  sleep 2
done
echo "✓ Database ready"

echo "⏳ Enabling PostGIS extensions..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || echo "  ⚠️ PostGIS extension skipped (may already exist)"
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null || true
echo "✓ Extensions ready"

echo "⏳ Running Prisma migrations..."
cd /app/packages/database
npx prisma migrate deploy || npx prisma db push
cd /app

echo "✓ Backend ready"

exec "$@"
