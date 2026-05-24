import { DiskCompressionCache } from '../core/DiskCompressionCache';
/**
 * Cleanup result with metrics
 */
export interface CleanupResult {
    timestamp: string;
    skillsScanned: number;
    versionsDeleted: number;
    deferredRetries: number;
    spaceFreed: number;
    durationMs: number;
}
/**
 * CompressionCleanupJob - Scheduled cleanup of compressed skill versions
 *
 * Strategy:
 * 1. Scan all .skills/{domain}/{skillname}/.compressed/ directories
 * 2. For each skill, call diskCache.cleanupExpiredVersions()
 * 3. Track deleted versions and deferred retries
 * 4. Log cleanup stats
 * 5. Update metrics
 */
export declare class CompressionCleanupJob {
    private diskCache;
    private skillsDirectory;
    private maxAgeDays;
    private logger;
    private cleanupTimer;
    private isRunning;
    private scheduleInterval;
    private cleanupBatchSize;
    private readonly CLEANUP_BATCH_INTERVAL_MS;
    constructor(diskCache: DiskCompressionCache, skillsDirectory: string, maxAgeDays?: number, scheduleInterval?: string, // 2 AM daily (cron notation)
    cleanupBatchSize?: number);
    /**
     * Start the cleanup job
     * Runs immediately on start, then schedules subsequent runs
     * based on the cron expression in scheduleInterval.
     * Uses setTimeout for drift-free scheduling (re-calculates after each run).
     */
    start(): void;
    /**
     * Stop the cleanup job
     */
    stop(): void;
    /**
     * Schedule the next cleanup execution based on the cron expression.
     * Uses setTimeout for precise scheduling instead of fixed-interval setInterval.
     * Re-schedules after each run for drift-free execution.
     */
    private scheduleNext;
    /**
     * Calculate milliseconds until the next match of a 5-field cron expression.
     * Fields: minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-6, 0=Sunday)
     * Supports: * (wildcard), N (exact value), step/N (every N)
     * Falls back to 24 hours on parse failure or no match within 7 days.
     */
    private msUntilNextCron;
    /**
     * Check if a cron field pattern matches a given value.
     * Supports: * (wildcard), step/N (every N), N (exact value)
     */
    private cronFieldMatches;
    /**
     * Run cleanup immediately (not on schedule)
     */
    runCleanup(): Promise<CleanupResult>;
    /**
     * Scan all compressed directories and cleanup expired versions with batch processing.
     * Processes CLEANUP_BATCH_SIZE skills at a time with delays between batches.
     * Non-blocking: logs progress per batch.
     */
    private scanAndCleanup;
    /**
     * Pre-warm cache by loading compressed versions for top skills.
     * Called on startup to ensure frequently accessed skills are ready.
     * Non-blocking: logs progress but doesn't throw.
     */
    preWarmCache(topSkillNames: string[]): Promise<void>;
    /**
     * Scan available domains in skills directory
     */
    private scanDomains;
}
/**
 * Extend CompressionMetrics with cleanup logging
 */
declare module '../utils/CompressionMetrics' {
    interface CompressionMetrics {
        logCleanup?(result: CleanupResult): void;
        logDeferredRetry?(skillName: string, version: string): void;
        logLLMCall?(skillName: string, latency: number, tokensGenerated: number): void;
    }
}
//# sourceMappingURL=CompressionCleanupJob.d.ts.map