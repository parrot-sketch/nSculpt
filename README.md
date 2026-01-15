# Nairobi Sculpt EHR - Enterprise Monorepo

Enterprise-grade Aesthetic Surgery EMR/EHR system.

## 🏗 Architecture

### Monorepo Structure
- `backend/`: NestJS API with Prisma ORM.
- `client/`: Next.js Frontend with Tailwind CSS and React Query.
- `docker/`: Shared infrastructure and configuration.

### Tech Stack
- **Frontend**: Next.js, TypeScript, TailwindCSS, Lucide.
- **Backend**: NestJS, PostgreSQL, Prisma, Redis.
- **Infrastructure**: Docker, GitHub Actions, Vercel, Render.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Local Setup
1. Clone the repository.
2. Initialize environment: `cp .env.example .env`
3. Start services: `docker-compose up -d`

## 🛠 CI/CD
Automated pipelines are configured via GitHub Actions:
- **CI**: Linting and building on every PR.
- **CD**: Auto-pushing Docker images to Docker Hub on branch merges.

## 🔐 Security
- Secrets managed via GitHub Secrets.
- Dependabot enabled for vulnerability scanning.
