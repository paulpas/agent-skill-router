// In-Memory Compression Cache
// LRU cache with 1-hour TTL from last access (not load)
// TTL resets on every hit for fresh entries
// Auto-expire on timeout with periodic cleanup

import { CompressedVersion } from './LLMSkillCompressor';
import { Logger } from '../observability/Logger';

/**
 * Cache entry with TTL metadata
 */
interface CacheEntry {
  content: CompressedVersion;
  createdAt: number; // timestamp in ms
  lastAccessedAt: number; // timestamp in ms (resets on every access)
  accessCount: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  size: number;
  entries: number;
  hits: number;
  misses: number;
  expirations: number;
}

/**
 * InMemoryCompressionCache - LRU cache with TTL-based eviction
 *
 * Strategy:
 * 1. Store compressed versions in memory with TTL metadata
 * 2. TTL is 1 hour from LAST ACCESS (not load) - resets on every hit
 * 3. On get: check if expired, return null if so
 * 4. On set: add to cache, reset TTL
 * 5. Periodically clean up expired entries
 * 6. Track hits/misses/expirations for metrics
 */
export class InMemoryCompressionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private logger: Logger;
  
  // Settings
  private readonly ttlMs: number;
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

  // Statistics
  private hits = 0;
  private misses = 0;
  private expirations = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Create a new in-memory cache
   * @param ttlMinutes TTL in minutes (default: 60 = 1 hour)
   */
  constructor(ttlMinutes: number = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.logger = new Logger('InMemoryCompressionCache');

    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Get a compressed version from cache
   * Returns null if expired or missing
   * Updates lastAccessedAt on hit (TTL reset)
   */
  get(skillName: string, version: string): CompressedVersion | null {
    // Guard: validate inputs
    if (!skillName || !version) {
      return null;
    }

    const key = this.buildKey(skillName, version);
    const entry = this.cache.get(key);

    // Guard: entry doesn't exist
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired (1 hour from last access)
    const now = Date.now();
    const ageMs = now - entry.lastAccessedAt;
    
    if (ageMs > this.ttlMs) {
      // Expired: remove and log
      this.cache.delete(key);
      this.expirations++;
      this.misses++;
      
      this.logger.debug('Cache entry expired', {
        skillName,
        version,
        ageMinutes: (ageMs / 1000 / 60).toFixed(1),
      });
      
      return null;
    }

    // Fresh hit: update lastAccessedAt (reset TTL) and increment accessCount
    entry.lastAccessedAt = now;
    entry.accessCount++;
    this.hits++;

    return entry.content;
  }

  /**
   * Set a compressed version in cache
   * Resets TTL on every set
   */
  set(skillName: string, version: string, content: CompressedVersion): void {
    // Guard: validate inputs
    if (!skillName || !version || !content) {
      this.logger.warn('Invalid input to set', {
        skillName,
        version,
        contentPresent: !!content,
      });
      return;
    }

    const key = this.buildKey(skillName, version);
    const now = Date.now();

    this.cache.set(key, {
      content,
      createdAt: now,
      lastAccessedAt: now, // Reset TTL on set
      accessCount: 0,
    });

    this.logger.debug('Added to cache', {
      skillName,
      version,
      cacheSize: this.cache.size,
    });
  }

  /**
   * Delete a specific version or all versions for a skill
   */
  delete(skillName: string, version?: string): void {
    // Guard: validate input
    if (!skillName) {
      return;
    }

    if (version) {
      // Delete specific version
      const key = this.buildKey(skillName, version);
      this.cache.delete(key);
      this.logger.debug('Deleted from cache', { skillName, version });
    } else {
      // Delete all versions for this skill
      let deletedCount = 0;
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${skillName}:`)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
      this.logger.debug('Deleted all versions from cache', {
        skillName,
        deletedCount,
      });
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.expirations = 0;
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      expirations: this.expirations,
    };
  }

  /**
   * Shutdown: stop cleanup timer
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.logger.info('Cache shutdown');
  }

  /**
   * Start periodic cleanup of expired entries
   * Private: called in constructor
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up expired entries from cache
   * Called periodically to prevent unbounded memory growth
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const ageMs = now - entry.lastAccessedAt;
      
      if (ageMs > this.ttlMs) {
        this.cache.delete(key);
        deletedCount++;
        this.expirations++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug('Cleaned up expired entries', {
        deleted: deletedCount,
        remaining: this.cache.size,
      });
    }
  }

  /**
   * Build cache key from skillName and version
   * Format: "skillName:version"
   */
  private buildKey(skillName: string, version: string): string {
    return `${skillName}:${version}`;
  }
}
