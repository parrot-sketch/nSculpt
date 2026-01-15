#!/bin/bash
set -e

# Get UID/GID from environment or use defaults
HOST_UID=${HOST_UID:-1000}
HOST_GID=${HOST_GID:-1000}

# Always construct DATABASE_URL with URL-encoded password
# This handles special characters like * in passwords
# NOTE: Database name should NOT be URL-encoded, only the password
# Use environment variables if available, otherwise use defaults
POSTGRES_USER=${POSTGRES_USER:-ehr_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-ehr_password}
POSTGRES_DB=${POSTGRES_DB:-surgical_ehr}
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

# URL-encode password only (database name should remain unencoded)
# Use Node.js to URL-encode (Node.js is always available in this image)
ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$POSTGRES_PASSWORD'))" 2>/dev/null || echo "$POSTGRES_PASSWORD")

# Always override DATABASE_URL to ensure password is correctly encoded
# Database name stays unencoded as PostgreSQL expects the actual name
export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
echo "✅ Constructed DATABASE_URL: postgresql://${POSTGRES_USER}:***@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

# Validate database connection before starting application
echo "🔍 Validating database configuration..."

# Check if postgresql-client is available (for psql command)
HAS_PSQL=false
if command -v psql >/dev/null 2>&1; then
  HAS_PSQL=true
elif [ -f "/usr/bin/psql" ]; then
  HAS_PSQL=true
fi

# Wait for postgres to be ready (with timeout)
echo "⏳ Waiting for PostgreSQL to be ready..."
if [ "$HAS_PSQL" = true ]; then
  for i in {1..30}; do
    if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
      echo "✅ PostgreSQL is ready"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "❌ ERROR: PostgreSQL did not become ready within 30 seconds"
      exit 1
    fi
    sleep 1
  done

  # Check if database exists
  DB_EXISTS=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" 2>/dev/null || echo "0")
  
  if [ "$DB_EXISTS" != "1" ]; then
    echo "⚠️  WARNING: Database '${POSTGRES_DB}' does not exist"
    echo "   Attempting to create database..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}\";" 2>/dev/null || {
      echo "❌ ERROR: Failed to create database '${POSTGRES_DB}'"
      echo "   Please create it manually or check your .env file"
      exit 1
    }
    echo "✅ Database '${POSTGRES_DB}' created"
  fi
else
  echo "⚠️  WARNING: psql not available, skipping database existence check"
  echo "   Will rely on Node.js validation script"
fi

# Fix permissions for dist directory (run as root if needed)
if [ "$(id -u)" = "0" ]; then
  # Running as root - fix permissions using numeric UID/GID
  chown -R ${HOST_UID}:${HOST_GID} /app || true
  chmod -R 755 /app || true
  # Ensure dist directory exists and has correct permissions
  mkdir -p /app/dist
  chown -R ${HOST_UID}:${HOST_GID} /app/dist
  chmod -R 755 /app/dist
  
  # Generate Prisma Client for current platform BEFORE validation
  # This is critical - validation script needs Prisma Client to be generated first
  USER_NAME=$(getent passwd ${HOST_UID} | cut -d: -f1 || echo "nestjs")
  
  echo "Generating Prisma Client..."
  PRISMA_GENERATED=false
  if command -v gosu >/dev/null 2>&1; then
    if gosu ${USER_NAME} npm run schema:generate; then
      PRISMA_GENERATED=true
    else
      echo "⚠️  Warning: Prisma Client generation failed, will retry..."
      sleep 2
      gosu ${USER_NAME} npm run schema:generate && PRISMA_GENERATED=true || true
    fi
  elif command -v su-exec >/dev/null 2>&1; then
    if su-exec ${USER_NAME} npm run schema:generate; then
      PRISMA_GENERATED=true
    else
      echo "⚠️  Warning: Prisma Client generation failed, will retry..."
      sleep 2
      su-exec ${USER_NAME} npm run schema:generate && PRISMA_GENERATED=true || true
    fi
  else
    if npm run schema:generate; then
      PRISMA_GENERATED=true
    else
      echo "⚠️  Warning: Prisma Client generation failed, will retry..."
      sleep 2
      npm run schema:generate && PRISMA_GENERATED=true || true
    fi
  fi
  
  # Verify Prisma Client was generated and symlink exists
  if [ ! -f "/app/node_modules/.prisma/client/index.d.ts" ]; then
    echo "⚠️  Warning: Prisma Client generation may have failed"
    echo "   Attempting to create symlink manually as fallback..."
    if command -v gosu >/dev/null 2>&1; then
      gosu ${USER_NAME} mkdir -p /app/node_modules/@prisma/client/.prisma && \
      gosu ${USER_NAME} ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
    elif command -v su-exec >/dev/null 2>&1; then
      su-exec ${USER_NAME} mkdir -p /app/node_modules/@prisma/client/.prisma && \
      su-exec ${USER_NAME} ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
    else
      mkdir -p /app/node_modules/@prisma/client/.prisma && \
      ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
    fi
    chown -R ${HOST_UID}:${HOST_GID} /app/node_modules/@prisma/client/.prisma 2>/dev/null || true
  elif [ ! -e "/app/node_modules/@prisma/client/.prisma/client" ]; then
    echo "⚠️  Warning: Prisma Client symlink missing - postinstall may have failed"
    echo "Attempting to create symlink manually as fallback..."
    if command -v gosu >/dev/null 2>&1; then
      gosu ${USER_NAME} mkdir -p /app/node_modules/@prisma/client/.prisma && \
      gosu ${USER_NAME} ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
    elif command -v su-exec >/dev/null 2>&1; then
      su-exec ${USER_NAME} mkdir -p /app/node_modules/@prisma/client/.prisma && \
      su-exec ${USER_NAME} ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
    else
      mkdir -p /app/node_modules/@prisma/client/.prisma && \
      ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
    fi
    chown -R ${HOST_UID}:${HOST_GID} /app/node_modules/@prisma/client/.prisma 2>/dev/null || true
  else
    echo "✅ Prisma Client generated and symlink verified"
    PRISMA_GENERATED=true
  fi
  
  # Validate database connection using Node.js script (more comprehensive)
  # Run AFTER Prisma Client is generated, but only if generation succeeded
  if [ "$PRISMA_GENERATED" = true ] && [ -f "/app/node_modules/.prisma/client/index.d.ts" ]; then
    if command -v node >/dev/null 2>&1; then
      if [ -f "/app/scripts/validate-db-connection.js" ]; then
        echo "🔍 Running database connection validation..."
        if command -v gosu >/dev/null 2>&1; then
          gosu ${USER_NAME} node /app/scripts/validate-db-connection.js || {
            echo "❌ ERROR: Database validation failed"
            echo "   Check your DATABASE_URL and POSTGRES_DB configuration"
            exit 1
          }
        elif command -v su-exec >/dev/null 2>&1; then
          su-exec ${USER_NAME} node /app/scripts/validate-db-connection.js || {
            echo "❌ ERROR: Database validation failed"
            echo "   Check your DATABASE_URL and POSTGRES_DB configuration"
            exit 1
          }
        else
          node /app/scripts/validate-db-connection.js || {
            echo "❌ ERROR: Database validation failed"
            echo "   Check your DATABASE_URL and POSTGRES_DB configuration"
            exit 1
          }
        fi
      else
        echo "⚠️  WARNING: Database validation script not found at /app/scripts/validate-db-connection.js"
        echo "   Skipping validation (this is OK if running locally)"
      fi
    else
      echo "⚠️  WARNING: Node.js not available for database validation"
    fi
  else
    echo "⚠️  WARNING: Prisma Client not generated, skipping database validation"
    echo "   Application may fail to start - check Prisma generation errors above"
  fi
  
  # Export DATABASE_URL so it's available to the child process
  export DATABASE_URL
  
  if command -v gosu >/dev/null 2>&1; then
    exec gosu ${USER_NAME} env DATABASE_URL="$DATABASE_URL" "$@"
  elif command -v su-exec >/dev/null 2>&1; then
    exec su-exec ${USER_NAME} env DATABASE_URL="$DATABASE_URL" "$@"
  else
    # Fallback: switch user and run
    echo "Warning: Neither gosu nor su-exec found, running as root"
    exec env DATABASE_URL="$DATABASE_URL" "$@"
  fi
else
  # Already running as nestjs user
  mkdir -p /app/dist
  
  # Generate Prisma Client for current platform
  echo "Generating Prisma Client..."
  PRISMA_GENERATED=false
  if npm run schema:generate; then
    PRISMA_GENERATED=true
  else
    echo "⚠️  Warning: Prisma Client generation failed, will retry..."
    sleep 2
    npm run schema:generate && PRISMA_GENERATED=true || true
  fi
  
  # Verify Prisma Client was generated and symlink exists
  if [ ! -f "/app/node_modules/.prisma/client/index.d.ts" ]; then
    echo "⚠️  Warning: Prisma Client generation may have failed"
    echo "   Attempting to create symlink manually as fallback..."
    mkdir -p /app/node_modules/@prisma/client/.prisma && \
    ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
  elif [ ! -e "/app/node_modules/@prisma/client/.prisma/client" ]; then
    echo "⚠️  Warning: Prisma Client symlink missing - postinstall may have failed"
    echo "Attempting to create symlink manually as fallback..."
    mkdir -p /app/node_modules/@prisma/client/.prisma && \
    ln -sf ../../../.prisma/client /app/node_modules/@prisma/client/.prisma/client || true
  else
    echo "✅ Prisma Client generated and symlink verified"
    PRISMA_GENERATED=true
  fi
  
  # Validate database connection using Node.js script (more comprehensive)
  # Run AFTER Prisma Client is generated, but only if generation succeeded
  if [ "$PRISMA_GENERATED" = true ] && [ -f "/app/node_modules/.prisma/client/index.d.ts" ]; then
    if command -v node >/dev/null 2>&1; then
      if [ -f "/app/scripts/validate-db-connection.js" ]; then
        echo "🔍 Running database connection validation..."
        node /app/scripts/validate-db-connection.js || {
          echo "❌ ERROR: Database validation failed"
          echo "   Check your DATABASE_URL and POSTGRES_DB configuration"
          exit 1
        }
      else
        echo "⚠️  WARNING: Database validation script not found at /app/scripts/validate-db-connection.js"
        echo "   Skipping validation (this is OK if running locally)"
      fi
    else
      echo "⚠️  WARNING: Node.js not available for database validation"
    fi
  else
    echo "⚠️  WARNING: Prisma Client not generated, skipping database validation"
    echo "   Application may fail to start - check Prisma generation errors above"
  fi
  
  # Export DATABASE_URL so it's available to the child process
  export DATABASE_URL
  
  exec env DATABASE_URL="$DATABASE_URL" "$@"
fi
