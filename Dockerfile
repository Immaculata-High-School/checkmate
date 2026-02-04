# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Regenerate Prisma client to ensure correct binary targets
RUN npx prisma generate

# Build the SvelteKit application
# Provide dummy DATABASE_URL for SvelteKit's post-build analysis (not used for actual connections)
# Cache bust: 2026-01-09
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl and required libraries for Prisma runtime
RUN apk add --no-cache openssl libssl3 libcrypto3

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy package files first
COPY --from=builder /app/package.json ./package.json

# Copy built application 
COPY --from=builder /app/build ./build

# Copy node_modules from builder (includes properly generated Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R sveltekit:nodejs /app

# Switch to non-root user
USER sveltekit

# Expose port
EXPOSE 3000

# Health check - more lenient to prevent excessive restarts
# Increased start-period for slower DB connections, reduced retries
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start the application
CMD ["node", "build"]
