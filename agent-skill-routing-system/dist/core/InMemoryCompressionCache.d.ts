import { CompressedVersion } from './LLMSkillCompressor';
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
export declare class InMemoryCompressionCache {
    private cache;
    private logger;
    private readonly ttlMs;
    private readonly CLEANUP_INTERVAL_MS;
    private hits;
    private misses;
    private expirations;
    private cleanupTimer;
    /**
     * Create a new in-memory cache
     * @param ttlMinutes TTL in minutes (default: 60 = 1 hour)
     */
    constructor(ttlMinutes?: number);
    /**
     * Get a compressed version from cache
     * Returns null if expired or missing
     * Updates lastAccessedAt on hit (TTL reset)
     */
    get(skillName: string, version: string): CompressedVersion | null;
    /**
     * Set a compressed version in cache
     * Resets TTL on every set
     */
    set(skillName: string, version: string, content: CompressedVersion): void;
    /**
     * Delete a specific version or all versions for a skill
     */
    delete(skillName: string, version?: string): void;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Shutdown: stop cleanup timer
     */
    shutdown(): void;
    /**
     * Start periodic cleanup of expired entries
     * Private: called in constructor
     */
    private startCleanupTimer;
    /**
     * Clean up expired entries from cache
     * Called periodically to prevent unbounded memory growth
     */
    private cleanupExpired;
    /**
     * Build cache key from skillName and version
     * Format: "skillName:version"
     */
    private buildKey;
}
//# sourceMappingURL=InMemoryCompressionCache.d.ts.map