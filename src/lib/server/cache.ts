/**
 * Simple in-memory cache with TTL support
 * Designed for ~500 concurrent students on limited server resources
 * 
 * Use this for:
 * - Frequently accessed data (user org memberships, class lists)
 * - Data that doesn't change often (test metadata, class info)
 * - Expensive queries that are repeated
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, evictions: 0 };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    // Clean up expired entries every 60 seconds
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
      // Prevent the interval from keeping the process alive
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set a value in cache with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict if at capacity (LRU based on hits)
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
      hits: 0
    });
    this.stats.size = this.cache.size;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Get or set with async factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    this.stats.size = this.cache.size;
  }

  /**
   * Evict least used entry
   */
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let minKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }

    if (minKey) {
      this.cache.delete(minKey);
      this.stats.evictions++;
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
export const cache = new MemoryCache(1000);

// TTL presets (in milliseconds)
export const TTL = {
  /** 30 seconds - for rapidly changing data */
  SHORT: 30 * 1000,
  /** 2 minutes - for semi-dynamic data */
  MEDIUM: 2 * 60 * 1000,
  /** 5 minutes - for stable data */
  LONG: 5 * 60 * 1000,
  /** 15 minutes - for rarely changing data */
  VERY_LONG: 15 * 60 * 1000,
  /** 1 hour - for static/config data */
  HOUR: 60 * 60 * 1000
} as const;

// Cache key generators for consistency
export const CacheKeys = {
  userOrgMemberships: (userId: string) => `user:${userId}:orgs`,
  classMembers: (classId: string) => `class:${classId}:members`,
  classInfo: (classId: string) => `class:${classId}:info`,
  testInfo: (testId: string) => `test:${testId}:info`,
  studentClasses: (studentId: string) => `student:${studentId}:classes`,
  teacherStats: (teacherId: string) => `teacher:${teacherId}:stats`,
  studentStats: (studentId: string) => `student:${studentId}:stats`,
} as const;

// Invalidation helpers
export function invalidateUserCache(userId: string): void {
  cache.deletePattern(`user:${userId}:`);
  cache.deletePattern(`student:${userId}:`);
  cache.deletePattern(`teacher:${userId}:`);
}

export function invalidateClassCache(classId: string): void {
  cache.deletePattern(`class:${classId}:`);
}

export function invalidateTestCache(testId: string): void {
  cache.deletePattern(`test:${testId}:`);
}

export default cache;
