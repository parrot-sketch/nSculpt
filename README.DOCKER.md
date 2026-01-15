# 🐳 Docker Quick Reference

## Quick Commands

```bash
# Start development environment
./scripts/docker-dev.sh start
# OR
docker-compose up -d

# View logs
./scripts/docker-dev.sh logs
# OR
docker-compose logs -f

# Stop services
./scripts/docker-dev.sh stop
# OR
docker-compose down

# Rebuild after code changes
./scripts/docker-dev.sh rebuild
# OR
docker-compose up -d --build

# Access backend shell
./scripts/docker-dev.sh shell backend

# Run database migrations
./scripts/docker-dev.sh migrate

# Production deployment
./scripts/docker-prod.sh deploy
```

## Service URLs

- **Backend API**: http://localhost:3001/api/v1
- **pgAdmin**: http://localhost:5050 (enable with `--profile tools`)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## First Time Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values

3. Start services:
   ```bash
   ./scripts/docker-dev.sh start
   ```

4. Run migrations:
   ```bash
   ./scripts/docker-dev.sh migrate
   ```

See [DOCKER.md](./DOCKER.md) for complete documentation.












