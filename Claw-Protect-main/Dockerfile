# ─────────────────────────────────────────────────────────────────────────────
# Claw Protect — Production Dockerfile
# Multi-stage: build React SPA + native addons, then copy to slim runner
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build (installs all deps including native addons, then bundles SPA)
FROM node:22-alpine AS builder

WORKDIR /app

# Native addon build tools required by better-sqlite3
RUN apk add --no-cache python3 make g++

# Install all deps (including devDeps for build; native addons compiled here)
COPY package*.json ./
RUN npm ci

# Copy source and build Vite SPA → dist/
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled node_modules from builder (includes the .node binary for better-sqlite3)
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source and static public assets
COPY server.ts ./
COPY src/ ./src/
COPY public/ ./public/
COPY tsconfig.json ./
COPY schemas/ ./schemas/
COPY package*.json ./

# tsx is needed to run server.ts; it is already in node_modules from builder
# Create data directory for SQLite DB persistence
RUN mkdir -p data && chown -R node:node /app

USER node

EXPOSE 3000

# Health check — hits the public health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "--loader", "tsx/esm", "server.ts"]
