#!/bin/bash
# Development Docker management script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function check_env_file() {
    if [ ! -f .env ]; then
        print_warn ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_info "Please update .env with your actual values before continuing."
        else
            print_error ".env.example not found!"
            exit 1
        fi
    fi
}

case "$1" in
    start)
        print_info "Starting development environment (including frontend)..."
        check_env_file
        # Use --force-recreate to avoid ContainerConfig errors from corrupted state
        if ! docker-compose --profile frontend up -d --force-recreate 2>&1 | tee /tmp/docker-start.log; then
            # If startup fails with ContainerConfig error, clean up and retry
            if grep -q "ContainerConfig" /tmp/docker-start.log 2>/dev/null; then
                print_warn "Detected container state issue, cleaning up..."
                docker-compose down --remove-orphans 2>/dev/null || true
                print_info "Retrying startup..."
                docker-compose --profile frontend up -d --force-recreate
            else
                print_error "Failed to start services. Check logs above."
                exit 1
            fi
        fi
        print_info "Services started. Use 'docker-compose logs -f' to view logs."
        print_info "Frontend: http://localhost:3000"
        print_info "Backend API: http://localhost:3002/api/v1"
        ;;
    stop)
        print_info "Stopping development environment..."
        docker-compose down
        ;;
    restart)
        print_info "Restarting development environment..."
        docker-compose restart
        ;;
    build)
        print_info "Building containers..."
        check_env_file
        docker-compose build --no-cache
        ;;
    rebuild)
        print_info "Rebuilding and starting containers (including frontend)..."
        check_env_file
        docker-compose --profile frontend up -d --build --force-recreate
        ;;
    logs)
        SERVICE=${2:-""}
        if [ -z "$SERVICE" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$SERVICE"
        fi
        ;;
    shell)
        SERVICE=${2:-backend}
        print_info "Opening shell in $SERVICE container..."
        docker-compose exec "$SERVICE" sh
        ;;
    db)
        print_info "Opening PostgreSQL shell..."
        docker-compose exec postgres psql -U "${POSTGRES_USER:-ehr_user}" -d "${POSTGRES_DB:-surgical_ehr}"
        ;;
    migrate)
        print_info "Running database migrations..."
        docker-compose exec backend npm run schema:migrate
        ;;
    clean)
        print_warn "This will remove all containers, volumes, and data!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            print_info "Cleaned up all containers and volumes."
        fi
        ;;
    status)
        docker-compose --profile frontend ps
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|build|rebuild|logs|shell|db|migrate|clean|status}"
        echo ""
        echo "Commands:"
        echo "  start     - Start all services (including frontend)"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  build     - Build all containers"
        echo "  rebuild   - Rebuild and start containers (including frontend)"
        echo "  logs      - View logs (optionally for a specific service)"
        echo "  shell     - Open shell in a container (default: backend)"
        echo "  db        - Open PostgreSQL shell"
        echo "  migrate   - Run database migrations"
        echo "  clean     - Remove all containers and volumes"
        echo "  status    - Show container status"
        echo ""
        echo "Services started:"
        echo "  - PostgreSQL (port 5432)"
        echo "  - Redis (port 6379)"
        echo "  - Backend API (port 3002)"
        echo "  - Frontend (port 3000)"
        exit 1
        ;;
esac












