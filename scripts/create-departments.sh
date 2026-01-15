#!/bin/bash

# Script to create departments via API
# Requires: Backend running on http://localhost:3002
# Requires: Admin user token

API_URL="http://localhost:3002/api/v1"
ADMIN_EMAIL="admin@nairobi-sculpt.com"
ADMIN_PASSWORD="Admin123!"

echo "🔐 Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login. Please check credentials."
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

echo "🏢 Creating departments..."

DEPARTMENTS=(
  '{"code":"ADMINISTRATION","name":"Administration","description":"System administration and management","active":true}'
  '{"code":"FRONT_DESK","name":"Front Desk","description":"Patient registration and front desk operations","active":true}'
  '{"code":"SURGERY","name":"Surgery","description":"Surgical department for procedures and operations","active":true}'
  '{"code":"NURSING","name":"Nursing","description":"Nursing department for patient care","active":true}'
  '{"code":"THEATER","name":"Operating Theater","description":"Operating theater management and scheduling","active":true}'
  '{"code":"CLEANING_AND_MAINTENANCE","name":"Cleaning and Maintenance","description":"Facility cleaning and maintenance operations","active":true}'
)

for dept in "${DEPARTMENTS[@]}"; do
  RESPONSE=$(curl -s -X POST "$API_URL/admin/departments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$dept")
  
  CODE=$(echo $dept | grep -o '"code":"[^"]*' | cut -d'"' -f4)
  if echo "$RESPONSE" | grep -q '"id"'; then
    echo "  ✅ Created: $CODE"
  else
    echo "  ⚠️  $CODE: $(echo $RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4 || echo 'Already exists or error')"
  fi
done

echo ""
echo "✨ Done!"
