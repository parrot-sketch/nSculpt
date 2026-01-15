# =========================
# Stage 1: Dependencies
# =========================
FROM node:20-slim AS dependencies

WORKDIR /app

# Install system deps required by Prisma
RUN apt-get update && apt-get install -y \
  openssl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force


# =========================
# Stage 2: Build
# =========================
FROM node:20-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y \
  openssl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy config files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install all dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY prisma ./prisma

# Generate Prisma Client + build
RUN npm run schema:generate && npm run build


# =========================
# Stage 3: Production
# =========================
FROM node:20-slim AS production

WORKDIR /app

# Install runtime deps
RUN apt-get update && apt-get install -y \
  openssl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy build artifacts
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy generated Prisma Client from build stage
# Note: We copy the generated client because:
# 1. Prisma CLI is in devDependencies (not available in production)
# 2. The build stage already generated for the correct platform
# 3. We just need to ensure the symlink exists via postinstall
COPY --from=build --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Run Prisma's postinstall to create the symlink
# This is safe because:
# 1. The generated client already exists (copied above)
# 2. Postinstall just creates the symlink, doesn't regenerate
# 3. @prisma/client package is already installed (production dependency)
USER root
RUN npm run postinstall --prefix node_modules/@prisma/client && \
    chown -R nestjs:nodejs /app/node_modules/.prisma && \
    chown -R nestjs:nodejs /app/node_modules/@prisma/client/.prisma 2>/dev/null || true
USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/patients', r => process.exit([200,401].includes(r.statusCode) ? 0 : 1))"

CMD ["node", "dist/main.js"]
