#!/bin/bash
# Production Docker management script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function check_prod_env() {
    if [ ! -f .env.production ]; then
        print_error ".env.production file not found!"
        print_info "Create .env.production with production values before deploying."
        exit 1
    fi
    
    # Check for required variables
    required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env.production || grep -q "^${var}=CHANGE_ME" .env.production; then
            print_error "$var must be set in .env.production"
            exit 1
        fi
    done
}

case "$1" in
    deploy)
        print_info "Deploying to production..."
        check_prod_env
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
        print_info "Production deployment complete!"
        ;;
    stop)
        print_info "Stopping production services..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
        ;;
    restart)
        print_info "Restarting production services..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart
        ;;
    logs)
        SERVICE=${2:-""}
        if [ -z "$SERVICE" ]; then
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
        else
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f "$SERVICE"
        fi
        ;;
    update)
        print_info "Updating production services..."
        check_prod_env
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
        print_info "Update complete!"
        ;;
    backup-db)
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        print_info "Creating database backup: $BACKUP_FILE"
        docker-compose exec -T postgres pg_dump -U "${POSTGRES_USER:-ehr_user}" "${POSTGRES_DB:-surgical_ehr}" > "$BACKUP_FILE"
        print_info "Backup created: $BACKUP_FILE"
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|update|backup-db}"
        echo ""
        echo "Commands:"
        echo "  deploy     - Deploy to production"
        echo "  stop       - Stop production services"
        echo "  restart    - Restart production services"
        echo "  logs       - View logs (optionally for a specific service)"
        echo "  update     - Update and rebuild production services"
        echo "  backup-db  - Create database backup"
        exit 1
        ;;
esac












