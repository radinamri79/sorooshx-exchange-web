# ============================================
# SorooshX Frontend Dockerfile
# Multi-stage build for Next.js 15
# ============================================

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BINANCE_WS_URL

# Set as environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_BINANCE_WS_URL=$NEXT_PUBLIC_BINANCE_WS_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
RUN npm run build

# ============================================
# Stage 3: Development
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install wget for health check
RUN apk add --no-cache wget

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Environment
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:3000 || exit 1

CMD ["npm", "run", "dev"]

# ============================================
# Stage 4: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install wget for health check
RUN apk add --no-cache wget

# Set environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -q --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
