/**
 * Single compression operation event
 */
export interface CompressionEvent {
    timestamp: string;
    event: 'compression' | 'cache_hit' | 'cache_miss' | 'cache_eviction' | 'compression_error';
    skillName?: string;
    compressionLevel?: number;
    tokensBefore?: number;
    tokensAfter?: number;
    compressPercent?: number;
    cacheHit?: boolean;
    ttlExpired?: boolean;
    error?: string | null;
    cacheSize?: number;
    accessCount?: number;
}
/**
 * Aggregated compression statistics
 */
export interface CompressionStats {
    totalOperations: number;
    successfulCompressions: number;
    failedCompressions: number;
    cacheHits: number;
    cacheMisses: number;
    evictions: number;
    totalTokensSaved: number;
    averageCompressionPercent: number;
    maxCacheSizeBytes: number;
    currentCacheSizeBytes: number;
}
/**
 * CompressionMetrics - Singleton for tracking compression operations
 *
 * Usage:
 *   const metrics = CompressionMetrics.getInstance();
 *   metrics.logCompressionEvent({ event: 'compression', skillName: 'foo', ... });
 *   metrics.getStats(); // Get aggregated statistics
 */
export declare class CompressionMetrics {
    private static instance;
    private events;
    private readonly MAX_EVENTS;
    private totalOperations;
    private successfulCompressions;
    private failedCompressions;
    private cacheHits;
    private cacheMisses;
    private evictions;
    private totalTokensSaved;
    private compressionPercents;
    private currentCacheSizeBytes;
    private maxCacheSizeBytes;
    private constructor();
    /**
     * Get or create singleton instance
     */
    static getInstance(): CompressionMetrics;
    /**
     * Log a compression event
     */
    logCompressionEvent(event: CompressionEvent): void;
    /**
     * Get aggregated compression statistics
     */
    getStats(): CompressionStats;
    /**
     * Set max cache size (for reporting)
     */
    setMaxCacheSize(bytes: number): void;
    /**
     * Get recent events (last N)
     */
    getRecentEvents(limit?: number): CompressionEvent[];
    /**
     * Get all events
     */
    getAllEvents(): CompressionEvent[];
    /**
     * Reset all metrics (for testing)
     */
    reset(): void;
    /**
     * Export all events as JSON
     */
    exportAsJSON(): string;
}
//# sourceMappingURL=CompressionMetrics.d.ts.map