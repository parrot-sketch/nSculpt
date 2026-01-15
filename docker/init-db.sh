#!/bin/sh
# Database initialization script
# This runs after PostgreSQL container starts

set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Run Prisma migrations if they exist
if [ -d "/docker-entrypoint-initdb.d/migrations" ]; then
    echo "Running database migrations..."
    # This would be called from the backend container after it starts
    # npx prisma migrate deploy
fi

echo "Database initialization complete!"












