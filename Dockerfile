# =============================================================================
# Raiyah Plus PERN Stack — unified production image
# Builds Vite client + Express API, serves SPA from Express
# =============================================================================

# ─── Stage 1: Build client ───────────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Stage 2: Build server ───────────────────────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/ ./
RUN npm run build

# ─── Stage 3: Production dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/prisma ./prisma
RUN npx prisma generate

# ─── Stage 4: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs appuser

COPY --from=deps /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/package.json ./package.json
COPY --from=client-builder /app/client/dist ./client/dist

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "dist/app.js"]
