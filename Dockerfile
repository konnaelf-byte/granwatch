# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install deps first (layer cache)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Prune dev deps
RUN pnpm prune --prod

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts + pruned node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Railway injects PORT
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
