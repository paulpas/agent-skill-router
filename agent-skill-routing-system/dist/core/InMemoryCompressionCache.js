"use strict";
// In-Memory Compression Cache
// LRU cache with 1-hour TTL from last access (not load)
// TTL resets on every hit for fresh entries
// Auto-expire on timeout with periodic cleanup
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCompressionCache = void 0;
const Logger_1 = require("../observability/Logger");
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
class InMemoryCompressionCache {
    cache = new Map();
    logger;
    // Settings
    ttlMs;
    CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
    // Statistics
    hits = 0;
    misses = 0;
    expirations = 0;
    cleanupTimer = null;
    /**
     * Create a new in-memory cache
     * @param ttlMinutes TTL in minutes (default: 60 = 1 hour)
     */
    constructor(ttlMinutes = 60) {
        this.ttlMs = ttlMinutes * 60 * 1000;
        this.logger = new Logger_1.Logger('InMemoryCompressionCache');
        // Start periodic cleanup
        this.startCleanupTimer();
    }
    /**
     * Get a compressed version from cache
     * Returns null if expired or missing
     * Updates lastAccessedAt on hit (TTL reset)
     */
    get(skillName, version) {
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
    set(skillName, version, content) {
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
    delete(skillName, version) {
        // Guard: validate input
        if (!skillName) {
            return;
        }
        if (version) {
            // Delete specific version
            const key = this.buildKey(skillName, version);
            this.cache.delete(key);
            this.logger.debug('Deleted from cache', { skillName, version });
        }
        else {
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
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        this.expirations = 0;
        this.logger.info('Cache cleared');
    }
    /**
     * Get cache statistics
     */
    getStats() {
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
    shutdown() {
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
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpired();
        }, this.CLEANUP_INTERVAL_MS);
    }
    /**
     * Clean up expired entries from cache
     * Called periodically to prevent unbounded memory growth
     */
    cleanupExpired() {
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
    buildKey(skillName, version) {
        return `${skillName}:${version}`;
    }
}
exports.InMemoryCompressionCache = InMemoryCompressionCache;
//# sourceMappingURL=InMemoryCompressionCache.js.map