.PHONY: help dev up down build rebuild logs shell db migrate clean status prod-deploy prod-stop backup

# Default target
help:
	@echo "Enterprise Surgical EHR - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment (all services including frontend)"
	@echo "  make up           - Start services (alias for dev)"
	@echo "  make down         - Stop services"
	@echo "  make build        - Build containers"
	@echo "  make rebuild      - Rebuild and start containers"
	@echo "  make logs         - View logs (all services)"
	@echo "  make logs SERVICE=backend - View logs for specific service"
	@echo "  make shell        - Open shell in backend container"
	@echo "  make db           - Open PostgreSQL shell"
	@echo "  make migrate      - Run database migrations"
	@echo "  make clean        - Remove all containers and volumes"
	@echo "  make status       - Show container status"
	@echo ""
	@echo "Production:"
	@echo "  make prod-deploy    - Deploy to production"
	@echo "  make prod-stop     - Stop production services"
	@echo "  make backup        - Create database backup"
	@echo ""

# Development commands
dev up:
	@./scripts/docker-dev.sh start

down:
	@./scripts/docker-dev.sh stop

build:
	@./scripts/docker-dev.sh build

rebuild:
	@./scripts/docker-dev.sh rebuild

logs:
	@./scripts/docker-dev.sh logs $(SERVICE)

shell:
	@./scripts/docker-dev.sh shell $(SERVICE)

db:
	@./scripts/docker-dev.sh db

migrate:
	@./scripts/docker-dev.sh migrate

clean:
	@./scripts/docker-dev.sh clean

status:
	@./scripts/docker-dev.sh status

# Production commands
prod-deploy:
	@./scripts/docker-prod.sh deploy

prod-stop:
	@./scripts/docker-prod.sh stop

backup:
	@./scripts/docker-prod.sh backup-db












