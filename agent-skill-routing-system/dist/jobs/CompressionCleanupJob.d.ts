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
    constructor(diskCache: DiskCompressionCache, skillsDirectory: string, maxAgeDays?: number, scheduleInterval?: string);
    /**
     * Start the cleanup job
     * For now: run on interval (24 hours default)
     * TODO: replace with actual cron when cron package is available
     */
    start(): void;
    /**
     * Stop the cleanup job
     */
    stop(): void;
    /**
     * Run cleanup immediately (not on schedule)
     */
    runCleanup(): Promise<CleanupResult>;
    /**
     * Scan all compressed directories and cleanup expired versions
     */
    private scanAndCleanup;
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