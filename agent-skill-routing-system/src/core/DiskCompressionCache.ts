// Disk Compression Cache
// Persists compressed versions to disk in .skills/{domain}/{skillname}/.compressed/ directories
// Implements lazy write strategy: commit to memory buffer first, async flush to disk
// Tracks access timestamps per version with 7-day invalidation + smart retry trigger

import fs from 'fs';
import path from 'path';
import { CompressedVersion, CompressedVersions } from './LLMSkillCompressor';
import { Logger } from '../observability/Logger';

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
 * In-memory write buffer entry (lazy write strategy)
 */
interface WriteBufferEntry {
  skillName: string;
  domain: string;
  versions: CompressedVersions;
  scheduledAt: Date;
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
export class DiskCompressionCache {
  private skillsDirectory: string;
  private logger: Logger;
  
  // Lazy write buffer
  private writeBuffer: Map<string, WriteBufferEntry> = new Map();
  private flushScheduled = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds
  private readonly FLUSH_THRESHOLD = 100; // flush when 100 pending

  // In-memory metadata cache (loaded on first access)
  private metadataCache: Map<string, CompressionMetadata> = new Map();
  
  // Settings
  private readonly MAX_AGE_DAYS = 7;
  private readonly ACCESS_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  private readonly SMART_RETRY_THRESHOLD = 2; // >2 accesses = retry candidate

  constructor(skillsDirectory: string) {
    this.skillsDirectory = skillsDirectory;
    this.logger = new Logger('DiskCompressionCache');
  }

  /**
   * Save compressed versions to disk (lazy write)
   * Early Exit: guard invalid inputs
   * Atomic: add to write buffer immediately, schedule async flush
   */
  async saveCompressedVersions(
    skillName: string,
    domain: string,
    versions: CompressedVersions
  ): Promise<void> {
    // Guard: validate inputs
    if (!skillName || !domain || !versions) {
      this.logger.error('Invalid input to saveCompressedVersions', {
        skillName,
        domain,
        versionsPresent: !!versions,
      });
      return;
    }

    // Guard: validate versions have content
    if (!versions.brief?.content || !versions.moderate?.content || !versions.detailed?.content) {
      this.logger.warn('Compressed versions missing content', {
        skillName,
        domain,
        briefPresent: !!versions.brief?.content,
        moderatePresent: !!versions.moderate?.content,
        detailedPresent: !!versions.detailed?.content,
      });
      return;
    }

    // Add to write buffer (lazy write)
    const bufferKey = `${domain}/${skillName}`;
    this.writeBuffer.set(bufferKey, {
      skillName,
      domain,
      versions,
      scheduledAt: new Date(),
    });

    this.logger.debug('Added to write buffer', {
      skillName,
      domain,
      bufferSize: this.writeBuffer.size,
    });

    // Schedule flush if not already scheduled
    if (!this.flushScheduled) {
      this.scheduleFlush();
    }

    // Force flush if threshold reached
    if (this.writeBuffer.size >= this.FLUSH_THRESHOLD) {
      this.logger.info('Write buffer threshold reached, flushing immediately', {
        bufferSize: this.writeBuffer.size,
      });
      await this.flush();
    }
  }

  /**
   * Get compressed version from disk if fresh
   * Returns null if expired or missing
   */
  async getCompressedVersion(
    skillName: string,
    domain: string,
    version: 'brief' | 'moderate' | 'detailed'
  ): Promise<CompressedVersion | null> {
    // Guard: validate inputs
    if (!skillName || !domain || !version) {
      return null;
    }

    try {
      // Load metadata (cached in memory)
      const metadata = await this.loadMetadata(skillName, domain);
      if (!metadata) {
        return null;
      }

      // Check if version exists in metadata
      const versionInfo = metadata.versions[version];
      if (!versionInfo) {
        return null;
      }

      // Check if expired (>7 days since creation)
      const createdDate = new Date(versionInfo.created);
      const ageDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > this.MAX_AGE_DAYS) {
        this.logger.info('Compressed version expired', {
          skillName,
          domain,
          version,
          ageDays: ageDays.toFixed(1),
        });
        return null;
      }

      // Load version file
      const versionDir = path.join(
        this.skillsDirectory,
        domain,
        skillName,
        '.compressed'
      );
      const versionFile = path.join(versionDir, `${version}.md`);

      const content = await fs.promises.readFile(versionFile, 'utf-8');

      // Update access time (async, don't await)
      this.updateAccessTime(skillName, domain, version).catch((err) => {
        this.logger.error('Failed to update access time', { skillName, domain, version, error: String(err) });
      });

      // Parse CompressedVersion from loaded file
      return {
        content,
        tokens: versionInfo.tokens,
        compressionRatio: versionInfo.compressionRatio,
        version,
        generatedAt: createdDate,
        isValid: true,
        validationErrors: [],
      };
    } catch (error) {
      this.logger.debug('Failed to get compressed version from disk', {
        skillName,
        domain,
        version,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Update access time and access count for a version
   * Atomic: update metadata and increment counter
   */
  async updateAccessTime(
    skillName: string,
    domain: string,
    version: 'brief' | 'moderate' | 'detailed'
  ): Promise<void> {
    // Guard: validate inputs
    if (!skillName || !domain || !version) {
      return;
    }

    try {
      const metadata = await this.loadMetadata(skillName, domain);
      if (!metadata || !metadata.versions[version]) {
        return;
      }

      // Update lastAccessed and accessCount
      const versionInfo = metadata.versions[version];
      versionInfo.lastAccessed = new Date().toISOString();
      versionInfo.accessCount++;

      // Update in-memory cache
      this.metadataCache.set(`${domain}/${skillName}`, metadata);

      // Schedule metadata save (lazy write)
      this.scheduleMetadataSave(skillName, domain, metadata);
    } catch (error) {
      this.logger.error('Failed to update access time', {
        skillName,
        domain,
        version,
        error: String(error),
      });
    }
  }

  /**
   * Clean up expired versions and identify deferred retries
   * Returns deleted versions and deferred retry candidates
   */
  async cleanupExpiredVersions(
    skillName: string,
    domain: string,
    maxAgeDays: number = this.MAX_AGE_DAYS
  ): Promise<{ deleted: string[]; deferred: string[] }> {
    const deleted: string[] = [];
    const deferred: string[] = [];

    try {
      const metadata = await this.loadMetadata(skillName, domain);
      if (!metadata) {
        return { deleted, deferred };
      }

      const now = Date.now();

      for (const [versionKey, versionInfo] of Object.entries(metadata.versions)) {
        const createdDate = new Date(versionInfo.created);
        const ageDays = (now - createdDate.getTime()) / (1000 * 60 * 60 * 24);

        // Check if expired
        if (ageDays > maxAgeDays) {
          // Check access count to determine if it should be deleted or retried
          const lastAccessedDate = new Date(versionInfo.lastAccessed);
          const lastAccessWindowMs = now - lastAccessedDate.getTime();
          
          // Smart retry trigger: accessed >2x in 30min
          if (versionInfo.accessCount > this.SMART_RETRY_THRESHOLD && 
              lastAccessWindowMs < this.ACCESS_WINDOW_MS) {
            // Mark for deferred retry instead of deletion
            versionInfo.status = 'deferred_retry';
            deferred.push(versionKey);
            this.logger.info('Marked version for deferred retry', {
              skillName,
              domain,
              version: versionKey,
              accessCount: versionInfo.accessCount,
            });
          } else {
            // Delete expired version
            try {
              const versionFile = path.join(
                this.skillsDirectory,
                domain,
                skillName,
                '.compressed',
                `${versionKey}.md`
              );
              await fs.promises.unlink(versionFile).catch(() => {
                // File might not exist, that's ok
              });
              deleted.push(versionKey);
              this.logger.debug('Deleted expired version', {
                skillName,
                domain,
                version: versionKey,
              });
            } catch (error) {
              this.logger.error('Failed to delete expired version', {
                skillName,
                domain,
                version: versionKey,
                error: String(error),
              });
            }
          }
        }
      }

      // Update metadata
      if (deleted.length > 0 || deferred.length > 0) {
        metadata.lastCleanup = new Date().toISOString();
        await this.saveMetadata(skillName, domain, metadata);
      }

      return { deleted, deferred };
    } catch (error) {
      this.logger.error('Failed to cleanup expired versions', {
        skillName,
        domain,
        error: String(error),
      });
      return { deleted, deferred };
    }
  }

  /**
   * Delete all compressed versions for a skill
   */
  async deleteAll(skillName: string, domain: string): Promise<void> {
    // Guard: validate inputs
    if (!skillName || !domain) {
      return;
    }

    try {
      const compressedDir = path.join(
        this.skillsDirectory,
        domain,
        skillName,
        '.compressed'
      );

      // Remove from memory cache
      this.metadataCache.delete(`${domain}/${skillName}`);
      this.writeBuffer.delete(`${domain}/${skillName}`);

      // Remove directory from disk (non-fatal if fails)
      try {
        await fs.promises.rm(compressedDir, { recursive: true, force: true });
        this.logger.info('Deleted all compressed versions', {
          skillName,
          domain,
        });
      } catch (error) {
        this.logger.debug('Failed to delete compressed directory', {
          skillName,
          domain,
          error: String(error),
        });
      }
    } catch (error) {
      this.logger.error('Failed to deleteAll', {
        skillName,
        domain,
        error: String(error),
      });
    }
  }

  /**
   * Schedule a flush of the write buffer
   * Debounced: batches writes every 5 seconds or on 100 pending
   */
  private scheduleFlush(): void {
    if (this.flushScheduled) {
      return;
    }

    this.flushScheduled = true;

    // Clear existing timer if any
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Schedule flush after FLUSH_INTERVAL_MS
    this.flushTimer = setTimeout(() => {
      this.flush().catch((err) => {
        this.logger.error('Failed to flush write buffer', {
          error: String(err),
        });
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush write buffer to disk
   * Atomic: process all pending writes together
   */
  private async flush(): Promise<void> {
    // Guard: nothing to flush
    if (this.writeBuffer.size === 0) {
      this.flushScheduled = false;
      return;
    }

    const bufferSize = this.writeBuffer.size;
    this.logger.info('Flushing write buffer', { size: bufferSize });

    const t0 = Date.now();
    let successCount = 0;
    let errorCount = 0;

    // Process all pending writes
    for (const [bufferKey, entry] of this.writeBuffer.entries()) {
      try {
        await this.flushEntry(entry);
        successCount++;
        this.writeBuffer.delete(bufferKey);
      } catch (error) {
        errorCount++;
        this.logger.error('Failed to flush entry', {
          bufferKey,
          error: String(error),
        });
      }
    }

    const durationMs = Date.now() - t0;
    this.logger.info('Write buffer flush complete', {
      total: bufferSize,
      successful: successCount,
      failed: errorCount,
      durationMs,
    });

    this.flushScheduled = false;
  }

  /**
   * Flush a single write buffer entry to disk
   */
  private async flushEntry(entry: WriteBufferEntry): Promise<void> {
    const { skillName, domain, versions } = entry;

    // Create compressed directory
    const compressedDir = path.join(
      this.skillsDirectory,
      domain,
      skillName,
      '.compressed'
    );
    await fs.promises.mkdir(compressedDir, { recursive: true });

    // Write each version file
    for (const [versionKey, version] of Object.entries(versions)) {
      const versionFile = path.join(compressedDir, `${versionKey}.md`);
      await fs.promises.writeFile(versionFile, version.content, 'utf-8');
    }

    // Create/update metadata
    const metadata: CompressionMetadata = {
      skillName,
      domain,
      versions: {
        brief: {
          created: versions.brief.generatedAt.toISOString(),
          lastAccessed: versions.brief.generatedAt.toISOString(),
          accessCount: 0,
          tokens: versions.brief.tokens,
          compressionRatio: versions.brief.compressionRatio,
          status: 'fresh',
        },
        moderate: {
          created: versions.moderate.generatedAt.toISOString(),
          lastAccessed: versions.moderate.generatedAt.toISOString(),
          accessCount: 0,
          tokens: versions.moderate.tokens,
          compressionRatio: versions.moderate.compressionRatio,
          status: 'fresh',
        },
        detailed: {
          created: versions.detailed.generatedAt.toISOString(),
          lastAccessed: versions.detailed.generatedAt.toISOString(),
          accessCount: 0,
          tokens: versions.detailed.tokens,
          compressionRatio: versions.detailed.compressionRatio,
          status: 'fresh',
        },
      },
      lastCleanup: new Date().toISOString(),
    };

    await this.saveMetadata(skillName, domain, metadata);
  }

  /**
   * Load metadata from disk or memory cache
   * Lazy load: cache in memory after first load
   */
  private async loadMetadata(
    skillName: string,
    domain: string
  ): Promise<CompressionMetadata | null> {
    const cacheKey = `${domain}/${skillName}`;

    // Check memory cache first
    if (this.metadataCache.has(cacheKey)) {
      return this.metadataCache.get(cacheKey) || null;
    }

    try {
      const metadataFile = path.join(
        this.skillsDirectory,
        domain,
        skillName,
        '.compressed',
        'metadata.json'
      );

      const content = await fs.promises.readFile(metadataFile, 'utf-8');
      const metadata: CompressionMetadata = JSON.parse(content);

      // Cache in memory
      this.metadataCache.set(cacheKey, metadata);

      return metadata;
    } catch (error) {
      // File doesn't exist or parse failed
      return null;
    }
  }

  /**
   * Save metadata to disk
   */
  private async saveMetadata(
    skillName: string,
    domain: string,
    metadata: CompressionMetadata
  ): Promise<void> {
    try {
      const compressedDir = path.join(
        this.skillsDirectory,
        domain,
        skillName,
        '.compressed'
      );
      const metadataFile = path.join(compressedDir, 'metadata.json');

      await fs.promises.mkdir(compressedDir, { recursive: true });
      await fs.promises.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save metadata', {
        skillName,
        domain,
        error: String(error),
      });
    }
  }

  /**
   * Schedule a metadata save (lazy write)
   */
  private scheduleMetadataSave(
    skillName: string,
    domain: string,
    metadata: CompressionMetadata
  ): void {
    // For now, save immediately (could be optimized with batch writes)
    this.saveMetadata(skillName, domain, metadata).catch((err) => {
      this.logger.error('Failed to save metadata', {
        skillName,
        domain,
        error: String(err),
      });
    });
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    bufferSize: number;
    cachedMetadata: number;
  } {
    return {
      bufferSize: this.writeBuffer.size,
      cachedMetadata: this.metadataCache.size,
    };
  }
}
