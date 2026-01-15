#!/bin/bash

# Helper script to import patients from Excel file in Docker
# Usage: ./scripts/import-patients.sh <path-to-excel-file>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if file argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Excel file path is required${NC}"
    echo "Usage: ./scripts/import-patients.sh <path-to-excel-file>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/import-patients.sh \"NS CLIENT FILES -.xlsx\""
    echo "  ./scripts/import-patients.sh \"/path/to/patients.xlsx\""
    exit 1
fi

EXCEL_FILE="$1"

# Check if file exists
if [ ! -f "$EXCEL_FILE" ]; then
    echo -e "${RED}Error: File not found: $EXCEL_FILE${NC}"
    exit 1
fi

# Get absolute path
EXCEL_FILE_ABS=$(cd "$(dirname "$EXCEL_FILE")" && pwd)/$(basename "$EXCEL_FILE")

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if backend container is running
if ! docker-compose ps backend | grep -q "Up"; then
    echo -e "${YELLOW}Warning: Backend container is not running. Starting it...${NC}"
    docker-compose up -d backend
    echo "Waiting for backend to be ready..."
    sleep 5
fi

# Copy file to backend directory if it's not already there
EXCEL_BASENAME=$(basename "$EXCEL_FILE")
BACKEND_FILE="backend/$EXCEL_BASENAME"

if [ "$EXCEL_FILE_ABS" != "$(cd "$(dirname "$BACKEND_FILE")" 2>/dev/null && pwd)/$(basename "$BACKEND_FILE")" ]; then
    echo -e "${YELLOW}Copying Excel file to backend directory...${NC}"
    cp "$EXCEL_FILE_ABS" "$BACKEND_FILE"
    echo -e "${GREEN}File copied to: $BACKEND_FILE${NC}"
fi

# Run import in Docker container
echo -e "${GREEN}Running patient import in Docker container...${NC}"
echo ""

docker-compose exec -T backend npx ts-node prisma/import-patients-from-excel.ts "$EXCEL_BASENAME"

# Clean up copied file if we created it
if [ -f "$BACKEND_FILE" ] && [ "$EXCEL_FILE_ABS" != "$(cd "$(dirname "$BACKEND_FILE")" 2>/dev/null && pwd)/$(basename "$BACKEND_FILE")" ]; then
    echo ""
    echo -e "${YELLOW}Cleaning up copied file...${NC}"
    rm "$BACKEND_FILE"
fi

echo ""
echo -e "${GREEN}✨ Import process completed!${NC}"
