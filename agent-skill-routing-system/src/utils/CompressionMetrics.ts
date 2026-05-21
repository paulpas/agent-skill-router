// Compression Metrics - Structured JSON logging for compression operations
// Singleton pattern for aggregating compression statistics

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
  cacheSize?: number; // bytes
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
export class CompressionMetrics {
  private static instance: CompressionMetrics;
  private events: CompressionEvent[] = [];
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

  // Aggregated stats
  private totalOperations = 0;
  private successfulCompressions = 0;
  private failedCompressions = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictions = 0;
  private totalTokensSaved = 0;
  private compressionPercents: number[] = [];
  private currentCacheSizeBytes = 0;
  private maxCacheSizeBytes = 0;

  private constructor() {
    // Singleton — no public construction
  }

  /**
   * Get or create singleton instance
   */
  public static getInstance(): CompressionMetrics {
    if (!CompressionMetrics.instance) {
      CompressionMetrics.instance = new CompressionMetrics();
    }
    return CompressionMetrics.instance;
  }

  /**
   * Log a compression event
   */
  public logCompressionEvent(event: CompressionEvent): void {
    // Add timestamp if not present
    const eventWithTimestamp: CompressionEvent = {
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
        } else {
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
  public getStats(): CompressionStats {
    const averagePercent =
      this.compressionPercents.length > 0
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
  public setMaxCacheSize(bytes: number): void {
    this.maxCacheSizeBytes = bytes;
  }

  /**
   * Get recent events (last N)
   */
  public getRecentEvents(limit: number = 100): CompressionEvent[] {
    return this.events.slice(-limit).reverse(); // newest first
  }

  /**
   * Get all events
   */
  public getAllEvents(): CompressionEvent[] {
    return [...this.events];
  }

  /**
   * Reset all metrics (for testing)
   */
  public reset(): void {
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
  public exportAsJSON(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      recentEvents: this.getRecentEvents(100),
    }, null, 2);
  }
}
