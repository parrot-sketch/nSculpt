#!/bin/bash
# Unified Development Environment Startup Script
# Starts all services including frontend for complete local development

# Don't use set -e here - we want to handle errors gracefully

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Enterprise Surgical EHR - Development Environment     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}Please update .env with your configuration${NC}"
    fi
fi

echo -e "${GREEN}🚀 Starting all services...${NC}"
echo ""

# Start all services including frontend
# Use --force-recreate to avoid ContainerConfig errors from corrupted state
START_OUTPUT=$(docker-compose --profile frontend up -d --force-recreate 2>&1)
START_EXIT_CODE=$?

# Check if ContainerConfig error occurred
if echo "$START_OUTPUT" | grep -q "ContainerConfig"; then
    echo -e "${YELLOW}⚠️  Detected container state issue, cleaning up...${NC}"
    docker-compose down --remove-orphans 2>/dev/null || true
    # Remove any orphaned containers with ehr- prefix
    docker ps -a --filter "name=ehr-" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
    echo -e "${GREEN}🔄 Retrying startup with clean state...${NC}"
    docker-compose --profile frontend up -d --force-recreate
elif [ $START_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Failed to start services:${NC}"
    echo "$START_OUTPUT"
    exit 1
else
    echo "$START_OUTPUT"
fi

echo ""
echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo -e "${BLUE}📍 Service URLs:${NC}"
echo -e "   Frontend:    ${GREEN}http://localhost:3000${NC}"
echo -e "   Backend API: ${GREEN}http://localhost:3002/api/v1${NC}"
echo -e "   PostgreSQL:  ${GREEN}localhost:5432${NC}"
echo -e "   Redis:       ${GREEN}localhost:6379${NC}"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "   View logs:    ${GREEN}docker-compose logs -f${NC}"
echo -e "   Status:       ${GREEN}docker-compose --profile frontend ps${NC}"
echo -e "   Stop all:     ${GREEN}docker-compose down${NC}"
echo -e "   Or use:       ${GREEN}make status${NC} / ${GREEN}make logs${NC} / ${GREEN}make down${NC}"
echo ""

# Wait a moment and show status
sleep 2
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose --profile frontend ps
