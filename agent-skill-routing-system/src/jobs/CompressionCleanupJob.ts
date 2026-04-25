// Compression Cleanup Job
// Daily cleanup of expired compressed versions
// Runs on configurable schedule (default: 2 AM daily)
// Removes versions unused >7 days, identifies deferred retries

import fs from 'fs';
import path from 'path';
import { DiskCompressionCache } from '../core/DiskCompressionCache';
import { Logger } from '../observability/Logger';
import { CompressionMetrics } from '../utils/CompressionMetrics';

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
export class CompressionCleanupJob {
  private diskCache: DiskCompressionCache;
  private skillsDirectory: string;
  private maxAgeDays: number;
  private logger: Logger;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private scheduleInterval: string;

  // Batch cleanup for 1,778 skills
  private cleanupBatchSize: number = 50; // process 50 skills at a time
  private readonly CLEANUP_BATCH_INTERVAL_MS = 500; // 500ms between batches

  constructor(
    diskCache: DiskCompressionCache,
    skillsDirectory: string,
    maxAgeDays: number = 7,
    scheduleInterval: string = '0 2 * * *', // 2 AM daily (cron notation)
    cleanupBatchSize: number = 50
  ) {
    this.diskCache = diskCache;
    this.skillsDirectory = skillsDirectory;
    this.maxAgeDays = maxAgeDays;
    this.scheduleInterval = scheduleInterval;
    this.cleanupBatchSize = cleanupBatchSize;
    this.logger = new Logger('CompressionCleanupJob');
  }

  /**
   * Start the cleanup job
   * For now: run on interval (24 hours default)
   * TODO: replace with actual cron when cron package is available
   */
  start(): void {
    // Run cleanup immediately on start
    this.runCleanup().catch((err) => {
      this.logger.error('Initial cleanup failed', {
        error: String(err),
      });
    });

    // Schedule daily cleanup (24 hours)
    this.cleanupTimer = setInterval(() => {
      this.runCleanup().catch((err) => {
        this.logger.error('Scheduled cleanup failed', {
          error: String(err),
        });
      });
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.logger.info('Compression cleanup job started', {
      scheduleInterval: this.scheduleInterval,
    });
  }

  /**
   * Stop the cleanup job
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.logger.info('Compression cleanup job stopped');
  }

  /**
   * Run cleanup immediately (not on schedule)
   */
  async runCleanup(): Promise<CleanupResult> {
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

      const result: CleanupResult = {
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
      const metrics = CompressionMetrics.getInstance();
      if (metrics.logCleanup) {
        metrics.logCleanup(result);
      }

      return result;
    } catch (error) {
      this.logger.error('Cleanup failed with error', {
        error: String(error),
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Scan all compressed directories and cleanup expired versions with batch processing.
   * Processes CLEANUP_BATCH_SIZE skills at a time with delays between batches.
   * Non-blocking: logs progress per batch.
   */
  private async scanAndCleanup(): Promise<{
    skillsScanned: number;
    versionsDeleted: number;
    deferredRetries: number;
    spaceFreed: number;
  }> {
    let skillsScanned = 0;
    let versionsDeleted = 0;
    let deferredRetries = 0;
    let spaceFreed = 0;

    try {
      // Scan skills directory structure: skills/{domain}/{skillname}/.compressed/
      const domains = await this.scanDomains();

      // Collect all skills to cleanup
      const skillsToCleanup: Array<{ domain: string; skillName: string }> = [];

      for (const domain of domains) {
        const domainPath = path.join(this.skillsDirectory, domain);

        try {
          const skills = await fs.promises.readdir(domainPath);

          for (const skillName of skills) {
            const compressedDir = path.join(domainPath, skillName, '.compressed');

            // Check if .compressed directory exists
            try {
              await fs.promises.access(compressedDir);
              skillsToCleanup.push({ domain, skillName });
            } catch {
              // Directory doesn't exist, skip
            }
          }
        } catch (error) {
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
            const result = await this.diskCache.cleanupExpiredVersions(
              skillName,
              domain,
              this.maxAgeDays
            );

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
          } catch (error) {
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
    } catch (error) {
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
  async preWarmCache(topSkillNames: string[]): Promise<void> {
    if (!topSkillNames || topSkillNames.length === 0) {
      return;
    }

    this.logger.info('[COMPRESSION-CLEANUP] pre-warming cache', { skillCount: topSkillNames.length });
    await this.diskCache.warmupCache(topSkillNames);
  }

  /**
   * Scan available domains in skills directory
   */
  private async scanDomains(): Promise<string[]> {
    const domains = ['agent', 'cncf', 'coding', 'programming', 'trading'];
    const available: string[] = [];

    for (const domain of domains) {
      const domainPath = path.join(this.skillsDirectory, domain);
      try {
        await fs.promises.access(domainPath);
        available.push(domain);
      } catch {
        // Domain directory doesn't exist
      }
    }

    return available;
  }
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
