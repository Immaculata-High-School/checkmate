import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build DATABASE_URL optimized for Prisma.io / serverless PostgreSQL
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  if (!baseUrl) return baseUrl;
  
  // Parse existing params
  const hasParams = baseUrl.includes('?');
  const params = new URLSearchParams();
  
  // Only add params if not already present in URL
  if (!baseUrl.includes('connection_limit')) {
    params.set('connection_limit', '5'); // Lower for serverless/pooled connections
  }
  if (!baseUrl.includes('pool_timeout')) {
    params.set('pool_timeout', '20'); // Wait up to 20s for connection from pool
  }
  if (!baseUrl.includes('connect_timeout')) {
    params.set('connect_timeout', '30'); // Wait up to 30s for initial connection (cold start)
  }
  // pgbouncer mode if using Prisma Accelerate or external pooler
  if (!baseUrl.includes('pgbouncer') && process.env.DATABASE_POOLED === 'true') {
    params.set('pgbouncer', 'true');
  }
  
  const paramStr = params.toString();
  if (!paramStr) return baseUrl;
  
  return `${baseUrl}${hasParams ? '&' : '?'}${paramStr}`;
}

// Create Prisma client with retry-capable configuration
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    }
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache in development to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Utility: Execute query with automatic retry on connection errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error worth retrying
      const isConnectionError = 
        error?.message?.includes('Connection') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('Closed') ||
        error?.code === 'P1001' || // Can't reach database server
        error?.code === 'P1002' || // Database server timeout
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1017';   // Server closed connection
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`[DB] Connection error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

// Middleware for query timing in development
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    // Only log queries over 500ms (remote DBs have latency)
    if (after - before > 500) {
      console.warn(`Slow query (${after - before}ms): ${params.model}.${params.action}`);
    }
    return result;
  });
}

export default prisma;
