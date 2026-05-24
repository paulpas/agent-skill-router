"use strict";
// Compression Cleanup Job
// Daily cleanup of expired compressed versions
// Runs on configurable schedule (default: 2 AM daily)
// Removes versions unused >7 days, identifies deferred retries
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionCleanupJob = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Logger_1 = require("../observability/Logger");
const CompressionMetrics_1 = require("../utils/CompressionMetrics");
const DomainRegistry_1 = require("../core/DomainRegistry");
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
class CompressionCleanupJob {
    diskCache;
    skillsDirectory;
    maxAgeDays;
    logger;
    cleanupTimer = null;
    isRunning = false;
    scheduleInterval;
    // Batch cleanup for 1,778 skills
    cleanupBatchSize = 50; // process 50 skills at a time
    CLEANUP_BATCH_INTERVAL_MS = 500; // 500ms between batches
    constructor(diskCache, skillsDirectory, maxAgeDays = 7, scheduleInterval = '0 2 * * *', // 2 AM daily (cron notation)
    cleanupBatchSize = 50) {
        this.diskCache = diskCache;
        this.skillsDirectory = skillsDirectory;
        this.maxAgeDays = maxAgeDays;
        this.scheduleInterval = scheduleInterval;
        this.cleanupBatchSize = cleanupBatchSize;
        this.logger = new Logger_1.Logger('CompressionCleanupJob');
    }
    /**
     * Start the cleanup job
     * Runs immediately on start, then schedules subsequent runs
     * based on the cron expression in scheduleInterval.
     * Uses setTimeout for drift-free scheduling (re-calculates after each run).
     */
    start() {
        // Run cleanup immediately on start
        this.runCleanup().catch((err) => {
            this.logger.error('Initial cleanup failed', {
                error: String(err),
            });
        });
        // Schedule next cleanup based on cron expression
        this.scheduleNext();
    }
    /**
     * Stop the cleanup job
     */
    stop() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.logger.info('Compression cleanup job stopped');
    }
    /**
     * Schedule the next cleanup execution based on the cron expression.
     * Uses setTimeout for precise scheduling instead of fixed-interval setInterval.
     * Re-schedules after each run for drift-free execution.
     */
    scheduleNext() {
        // Clear existing timer if any
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        const delay = this.msUntilNextCron(this.scheduleInterval);
        this.logger.info('Next cleanup scheduled', {
            delayMs: delay,
            nextRun: new Date(Date.now() + delay).toISOString(),
            schedule: this.scheduleInterval,
        });
        this.cleanupTimer = setTimeout(() => {
            // Run cleanup in background
            this.runCleanup().catch((err) => {
                this.logger.error('Scheduled cleanup failed', {
                    error: String(err),
                });
            });
            // Re-schedule after completion
            this.scheduleNext();
        }, delay);
    }
    /**
     * Calculate milliseconds until the next match of a 5-field cron expression.
     * Fields: minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-6, 0=Sunday)
     * Supports: * (wildcard), N (exact value), step/N (every N)
     * Falls back to 24 hours on parse failure or no match within 7 days.
     */
    msUntilNextCron(cronExpr) {
        const fields = cronExpr.trim().split(/\s+/);
        if (fields.length !== 5) {
            this.logger.warn('Invalid cron expression, defaulting to 24h interval', { expression: cronExpr });
            return 24 * 60 * 60 * 1000;
        }
        const now = new Date();
        const currentMin = now.getMinutes();
        // Search within next 7 days for the next match
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + dayOffset);
            checkDate.setSeconds(0, 0);
            const checkMonth = checkDate.getMonth() + 1;
            const checkDom = checkDate.getDate();
            const checkDow = checkDate.getDay();
            if (!this.cronFieldMatches(fields[4], checkDow))
                continue; // day of week
            if (!this.cronFieldMatches(fields[3], checkMonth))
                continue; // month
            if (!this.cronFieldMatches(fields[2], checkDom))
                continue; // day of month
            // For the current day, start from current hour
            const startHour = (dayOffset === 0) ? now.getHours() : 0;
            for (let h = startHour; h < 24; h++) {
                if (!this.cronFieldMatches(fields[1], h))
                    continue; // hour
                const mStart = (dayOffset === 0 && h === startHour) ? currentMin : 0;
                for (let m = mStart; m < 60; m++) {
                    if (!this.cronFieldMatches(fields[0], m))
                        continue; // minute
                    // Skip immediate re-fire (must be at least 1 minute in the future)
                    if (dayOffset === 0 && h === startHour && m <= currentMin)
                        continue;
                    checkDate.setHours(h, m, 0, 0);
                    const delay = checkDate.getTime() - now.getTime();
                    if (delay > 0)
                        return delay;
                }
            }
        }
        this.logger.warn('No cron match within 7 days, defaulting to 24h interval', { expression: cronExpr });
        return 24 * 60 * 60 * 1000;
    }
    /**
     * Check if a cron field pattern matches a given value.
     * Supports: * (wildcard), step/N (every N), N (exact value)
     */
    cronFieldMatches(pattern, value) {
        if (pattern === '*')
            return true;
        if (pattern.startsWith('*/')) {
            const step = parseInt(pattern.slice(2), 10);
            return step > 0 && value % step === 0;
        }
        const exact = parseInt(pattern, 10);
        return !isNaN(exact) && exact === value;
    }
    /**
     * Run cleanup immediately (not on schedule)
     */
    async runCleanup() {
        // Guard: prevent concurrent runs
        if (this.isRunning) {
            this.logger.warn('Cleanup already running, skipping');
            return {
                timestamp: new Date().toISOString(),
                skillsScanned: 0,
                versionsDeleted: 0,
                deferredRetries: 0,
                spaceFreed: 0,
                durationMs: 0,
            };
        }
        this.isRunning = true;
        const t0 = Date.now();
        try {
            this.logger.info('Starting compression cleanup');
            // Scan all .compressed directories
            const scanned = await this.scanAndCleanup();
            const durationMs = Date.now() - t0;
            const result = {
                timestamp: new Date().toISOString(),
                skillsScanned: scanned.skillsScanned,
                versionsDeleted: scanned.versionsDeleted,
                deferredRetries: scanned.deferredRetries,
                spaceFreed: scanned.spaceFreed,
                durationMs,
            };
            // Log result
            this.logger.info('Compression cleanup complete', {
                skillsScanned: result.skillsScanned,
                versionsDeleted: result.versionsDeleted,
                deferredRetries: result.deferredRetries,
                spaceFreedMB: (result.spaceFreed / 1024 / 1024).toFixed(2),
                durationMs,
            });
            // Update metrics
            const metrics = CompressionMetrics_1.CompressionMetrics.getInstance();
            if (metrics.logCleanup) {
                metrics.logCleanup(result);
            }
            return result;
        }
        catch (error) {
            this.logger.error('Cleanup failed with error', {
                error: String(error),
            });
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Scan all compressed directories and cleanup expired versions with batch processing.
     * Processes CLEANUP_BATCH_SIZE skills at a time with delays between batches.
     * Non-blocking: logs progress per batch.
     */
    async scanAndCleanup() {
        let skillsScanned = 0;
        let versionsDeleted = 0;
        let deferredRetries = 0;
        let spaceFreed = 0;
        try {
            // Scan skills directory structure: skills/{domain}/{skillname}/.compressed/
            const domains = await this.scanDomains();
            // Collect all skills to cleanup
            const skillsToCleanup = [];
            for (const domain of domains) {
                const domainPath = path_1.default.join(this.skillsDirectory, domain);
                try {
                    const skills = await fs_1.default.promises.readdir(domainPath);
                    for (const skillName of skills) {
                        const compressedDir = path_1.default.join(domainPath, skillName, '.compressed');
                        // Check if .compressed directory exists
                        try {
                            await fs_1.default.promises.access(compressedDir);
                            skillsToCleanup.push({ domain, skillName });
                        }
                        catch {
                            // Directory doesn't exist, skip
                        }
                    }
                }
                catch (error) {
                    this.logger.debug('Error scanning domain', {
                        domain,
                        error: String(error),
                    });
                }
            }
            // Process skills in batches with delays between batches
            for (let i = 0; i < skillsToCleanup.length; i += this.cleanupBatchSize) {
                const batch = skillsToCleanup.slice(i, i + this.cleanupBatchSize);
                // Process batch in parallel
                const batchPromises = batch.map(async ({ domain, skillName }) => {
                    try {
                        const result = await this.diskCache.cleanupExpiredVersions(skillName, domain, this.maxAgeDays);
                        skillsScanned++;
                        versionsDeleted += result.deleted.length;
                        deferredRetries += result.deferred.length;
                        spaceFreed += result.deleted.length * 1024; // ~1KB per version
                        if (result.deleted.length > 0 || result.deferred.length > 0) {
                            this.logger.debug('Cleaned up skill', {
                                skillName,
                                domain,
                                deleted: result.deleted.length,
                                deferred: result.deferred.length,
                            });
                        }
                    }
                    catch (error) {
                        this.logger.debug('Failed to cleanup skill', {
                            skillName,
                            domain,
                            error: String(error),
                        });
                    }
                });
                await Promise.all(batchPromises);
                // Log progress and delay between batches
                this.logger.debug('Cleanup batch complete', {
                    batchNumber: Math.floor(i / this.cleanupBatchSize) + 1,
                    skillsInBatch: batch.length,
                    totalScanned: skillsScanned,
                    totalDeleted: versionsDeleted,
                });
                // Delay between batches to avoid I/O overhead
                if (i + this.cleanupBatchSize < skillsToCleanup.length) {
                    await new Promise((resolve) => setTimeout(resolve, this.CLEANUP_BATCH_INTERVAL_MS));
                }
            }
        }
        catch (error) {
            this.logger.error('Error during cleanup scan', {
                error: String(error),
            });
        }
        return {
            skillsScanned,
            versionsDeleted,
            deferredRetries,
            spaceFreed,
        };
    }
    /**
     * Pre-warm cache by loading compressed versions for top skills.
     * Called on startup to ensure frequently accessed skills are ready.
     * Non-blocking: logs progress but doesn't throw.
     */
    async preWarmCache(topSkillNames) {
        if (!topSkillNames || topSkillNames.length === 0) {
            return;
        }
        this.logger.info('[COMPRESSION-CLEANUP] pre-warming cache', { skillCount: topSkillNames.length });
        await this.diskCache.warmupCache(topSkillNames);
    }
    /**
     * Scan available domains in skills directory
     */
    async scanDomains() {
        // Use DomainRegistry for dynamic domain discovery instead of hardcoded list
        // This ensures writing/ and coding/ domains (which exist on disk) are included,
        // while swe (which doesn't exist) is excluded
        const domainRegistry = DomainRegistry_1.DomainRegistry.getInstance();
        const domains = await domainRegistry.discoverDomains(this.skillsDirectory);
        const available = [];
        for (const domain of domains) {
            const domainPath = path_1.default.join(this.skillsDirectory, domain);
            try {
                await fs_1.default.promises.access(domainPath);
                available.push(domain);
            }
            catch {
                // Domain directory doesn't exist
            }
        }
        return available;
    }
}
exports.CompressionCleanupJob = CompressionCleanupJob;
//# sourceMappingURL=CompressionCleanupJob.js.map