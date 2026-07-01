# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install deps first (layer cache)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --no-frozen-lockfile

# Declare build args for Vite env vars — Railway passes these automatically.
# Placing them here (after deps install) ensures the cache is invalidated
# when the key changes, while still caching the slow pnpm install step.
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_REVENUECAT_IOS_KEY
ENV VITE_REVENUECAT_IOS_KEY=$VITE_REVENUECAT_IOS_KEY
ARG VITE_REVENUECAT_ANDROID_KEY
ENV VITE_REVENUECAT_ANDROID_KEY=$VITE_REVENUECAT_ANDROID_KEY

# Copy source and build
COPY . .
RUN pnpm run build

# Prune dev deps
RUN pnpm prune --prod

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts + pruned node_modules + drizzle migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle

# Railway injects PORT
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
