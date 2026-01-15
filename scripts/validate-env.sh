#!/bin/bash
# Environment Configuration Validation Script
#
# Validates that .env file configuration matches expected values
# and checks for common configuration mismatches

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  WARNING: .env file not found at $ENV_FILE"
  echo "   Creating a template .env file..."
  cat > "$ENV_FILE" << 'EOF'
# Database Configuration
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=surgical_ehr
POSTGRES_PORT=5432

# Application Configuration
NODE_ENV=development
BACKEND_PORT=3001
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
CORS_ORIGIN=*

# Redis Configuration
REDIS_PASSWORD=CHANGE_ME
EOF
  echo "✅ Created template .env file. Please update with your values."
  exit 0
fi

echo "🔍 Validating .env file configuration..."

# Source the .env file
set -a
source "$ENV_FILE"
set +a

ERRORS=0
WARNINGS=0

# Check required variables
REQUIRED_VARS=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB")
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ ERROR: $var is not set in .env file"
    ERRORS=$((ERRORS + 1))
  fi
done

# Validate POSTGRES_DB is not using password value
if [ "$POSTGRES_DB" = "$POSTGRES_PASSWORD" ]; then
  echo "❌ ERROR: POSTGRES_DB matches POSTGRES_PASSWORD (common misconfiguration)"
  echo "   POSTGRES_DB should be the database name (e.g., 'surgical_ehr')"
  echo "   POSTGRES_PASSWORD should be the password"
  ERRORS=$((ERRORS + 1))
fi

# Check for common database name mistakes
if [[ "$POSTGRES_DB" == *"*"* ]] || [[ "$POSTGRES_DB" == *"password"* ]] || [[ "$POSTGRES_DB" == *"PASSWORD"* ]]; then
  echo "⚠️  WARNING: POSTGRES_DB contains suspicious characters"
  echo "   Database name: $POSTGRES_DB"
  echo "   This might be a configuration error"
  WARNINGS=$((WARNINGS + 1))
fi

# Validate database name format (should be alphanumeric, underscore, hyphen)
if [[ ! "$POSTGRES_DB" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "⚠️  WARNING: POSTGRES_DB contains unusual characters"
  echo "   Database name: $POSTGRES_DB"
  echo "   PostgreSQL database names should be alphanumeric with underscores/hyphens"
  WARNINGS=$((WARNINGS + 1))
fi

# Check if password is still default
if [ "$POSTGRES_PASSWORD" = "CHANGE_ME" ] || [ "$POSTGRES_PASSWORD" = "ehr_password" ]; then
  echo "⚠️  WARNING: Using default password. Change it in production!"
  WARNINGS=$((WARNINGS + 1))
fi

# Check JWT_SECRET
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change-me-in-production" ]; then
  echo "⚠️  WARNING: JWT_SECRET is not set or using default value"
  WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ .env file validation passed"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Validation completed with $WARNINGS warning(s)"
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
  exit 1
fi







