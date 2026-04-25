import { CompressedVersion, CompressedVersions } from './LLMSkillCompressor';
/**
 * Compression metadata tracking access times and version freshness
 */
export interface CompressionMetadata {
    skillName: string;
    domain: string;
    versions: Record<string, {
        created: string;
        lastAccessed: string;
        accessCount: number;
        tokens: number;
        compressionRatio: number;
        status: 'fresh' | 'expired' | 'deferred_retry';
    }>;
    lastCleanup: string;
}
/**
 * DiskCompressionCache - Persists compressed skill versions to disk
 *
 * Strategy:
 * 1. Accept compressed versions (brief/moderate/detailed)
 * 2. Write to memory buffer immediately (lazy strategy)
 * 3. Schedule async flush to disk (debounced, max 5 seconds or 100 pending)
 * 4. Track access timestamps (lastAccessed, accessCount)
 * 5. Implement 7-day invalidation
 * 6. Smart retry trigger: if accessed >2x in 30min, mark for deferred retry
 * 7. Graceful fallback: if disk fails, log error but don't throw
 */
export declare class DiskCompressionCache {
    private skillsDirectory;
    private logger;
    private writeBuffer;
    private flushScheduled;
    private flushTimer;
    private readonly FLUSH_INTERVAL_MS;
    private readonly FLUSH_THRESHOLD;
    private readonly BATCH_COMPRESSION_SIZE;
    private readonly BATCH_COMPRESSION_INTERVAL_MS;
    private metadataCache;
    private readonly MAX_AGE_DAYS;
    private readonly ACCESS_WINDOW_MS;
    private readonly SMART_RETRY_THRESHOLD;
    constructor(skillsDirectory: string);
    /**
     * Warm up cache by pre-loading and caching compressed versions for top skills.
     * Non-blocking: doesn't throw on errors, logs progress.
     * Used on startup to ensure frequently accessed skills are ready.
     */
    warmupCache(topSkillNames: string[]): Promise<void>;
    /**
     * Save compressed versions to disk (lazy write)
     * Early Exit: guard invalid inputs
     * Atomic: add to write buffer immediately, schedule async flush
     */
    saveCompressedVersions(skillName: string, domain: string, versions: CompressedVersions): Promise<void>;
    /**
     * Get compressed version from disk if fresh
     * Returns null if expired or missing
     */
    getCompressedVersion(skillName: string, domain: string, version: 'brief' | 'moderate' | 'detailed'): Promise<CompressedVersion | null>;
    /**
     * Update access time and access count for a version
     * Atomic: update metadata and increment counter
     */
    updateAccessTime(skillName: string, domain: string, version: 'brief' | 'moderate' | 'detailed'): Promise<void>;
    /**
     * Clean up expired versions and identify deferred retries
     * Returns deleted versions and deferred retry candidates
     */
    cleanupExpiredVersions(skillName: string, domain: string, maxAgeDays?: number): Promise<{
        deleted: string[];
        deferred: string[];
    }>;
    /**
     * Delete all compressed versions for a skill
     */
    deleteAll(skillName: string, domain: string): Promise<void>;
    /**
     * Schedule a flush of the write buffer
     * Debounced: batches writes every 5 seconds or on 100 pending
     */
    private scheduleFlush;
    /**
     * Flush write buffer to disk with batch processing.
     * Processes BATCH_COMPRESSION_SIZE entries at a time with delays between batches.
     * Non-blocking: doesn't throw on errors, logs progress.
     */
    private flush;
    /**
     * Flush a single write buffer entry to disk
     */
    private flushEntry;
    /**
     * Load metadata from disk or memory cache
     * Lazy load: cache in memory after first load
     */
    private loadMetadata;
    /**
     * Save metadata to disk
     */
    private saveMetadata;
    /**
     * Schedule a metadata save (lazy write)
     */
    private scheduleMetadataSave;
    /**
     * Get stats for monitoring
     */
    getStats(): {
        bufferSize: number;
        cachedMetadata: number;
    };
}
//# sourceMappingURL=DiskCompressionCache.d.ts.map