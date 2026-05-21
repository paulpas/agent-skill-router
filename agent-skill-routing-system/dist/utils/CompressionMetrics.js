"use strict";
// Compression Metrics - Structured JSON logging for compression operations
// Singleton pattern for aggregating compression statistics
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionMetrics = void 0;
/**
 * CompressionMetrics - Singleton for tracking compression operations
 *
 * Usage:
 *   const metrics = CompressionMetrics.getInstance();
 *   metrics.logCompressionEvent({ event: 'compression', skillName: 'foo', ... });
 *   metrics.getStats(); // Get aggregated statistics
 */
class CompressionMetrics {
    static instance;
    events = [];
    MAX_EVENTS = 10000; // Keep last 10k events in memory
    // Aggregated stats
    totalOperations = 0;
    successfulCompressions = 0;
    failedCompressions = 0;
    cacheHits = 0;
    cacheMisses = 0;
    evictions = 0;
    totalTokensSaved = 0;
    compressionPercents = [];
    currentCacheSizeBytes = 0;
    maxCacheSizeBytes = 0;
    constructor() {
        // Singleton — no public construction
    }
    /**
     * Get or create singleton instance
     */
    static getInstance() {
        if (!CompressionMetrics.instance) {
            CompressionMetrics.instance = new CompressionMetrics();
        }
        return CompressionMetrics.instance;
    }
    /**
     * Log a compression event
     */
    logCompressionEvent(event) {
        // Add timestamp if not present
        const eventWithTimestamp = {
            ...event,
            timestamp: event.timestamp || new Date().toISOString(),
        };
        // Store event (FIFO: remove oldest if we exceed max)
        this.events.push(eventWithTimestamp);
        if (this.events.length > this.MAX_EVENTS) {
            this.events.shift();
        }
        // Update aggregated stats based on event type
        switch (event.event) {
            case 'compression': {
                this.totalOperations++;
                if (event.error) {
                    this.failedCompressions++;
                }
                else {
                    this.successfulCompressions++;
                    if (event.compressPercent !== undefined) {
                        this.compressionPercents.push(event.compressPercent);
                    }
                    if (event.tokensBefore !== undefined && event.tokensAfter !== undefined) {
                        this.totalTokensSaved += event.tokensBefore - event.tokensAfter;
                    }
                }
                break;
            }
            case 'cache_hit': {
                this.cacheHits++;
                break;
            }
            case 'cache_miss': {
                this.cacheMisses++;
                break;
            }
            case 'cache_eviction': {
                this.evictions++;
                break;
            }
        }
        // Update cache size
        if (event.cacheSize !== undefined) {
            this.currentCacheSizeBytes = event.cacheSize;
        }
    }
    /**
     * Get aggregated compression statistics
     */
    getStats() {
        const averagePercent = this.compressionPercents.length > 0
            ? this.compressionPercents.reduce((a, b) => a + b, 0) / this.compressionPercents.length
            : 0;
        return {
            totalOperations: this.totalOperations,
            successfulCompressions: this.successfulCompressions,
            failedCompressions: this.failedCompressions,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            evictions: this.evictions,
            totalTokensSaved: this.totalTokensSaved,
            averageCompressionPercent: averagePercent,
            maxCacheSizeBytes: this.maxCacheSizeBytes,
            currentCacheSizeBytes: this.currentCacheSizeBytes,
        };
    }
    /**
     * Set max cache size (for reporting)
     */
    setMaxCacheSize(bytes) {
        this.maxCacheSizeBytes = bytes;
    }
    /**
     * Get recent events (last N)
     */
    getRecentEvents(limit = 100) {
        return this.events.slice(-limit).reverse(); // newest first
    }
    /**
     * Get all events
     */
    getAllEvents() {
        return [...this.events];
    }
    /**
     * Reset all metrics (for testing)
     */
    reset() {
        this.events = [];
        this.totalOperations = 0;
        this.successfulCompressions = 0;
        this.failedCompressions = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.evictions = 0;
        this.totalTokensSaved = 0;
        this.compressionPercents = [];
        this.currentCacheSizeBytes = 0;
    }
    /**
     * Export all events as JSON
     */
    exportAsJSON() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            stats: this.getStats(),
            recentEvents: this.getRecentEvents(100),
        }, null, 2);
    }
}
exports.CompressionMetrics = CompressionMetrics;
//# sourceMappingURL=CompressionMetrics.js.map