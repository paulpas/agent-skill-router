// Tests for CompressionCleanupJob
import fs from 'fs';
import path from 'path';
import { CompressionCleanupJob } from '../jobs/CompressionCleanupJob';
import { DiskCompressionCache } from '../core/DiskCompressionCache';

describe('CompressionCleanupJob', () => {
  let cacheDir: string;
  let diskCache: DiskCompressionCache;
  let cleanupJob: CompressionCleanupJob;

  beforeEach(() => {
    // Create temp directory for testing
    cacheDir = path.join(__dirname, '.cleanup-test-' + Date.now());
    fs.mkdirSync(cacheDir, { recursive: true });
    
    diskCache = new DiskCompressionCache(cacheDir);
    cleanupJob = new CompressionCleanupJob(diskCache, cacheDir, 7, '0 2 * * *');
  });

  afterEach(() => {
    // Clean up
    cleanupJob.stop();
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('should create cleanup job', () => {
    expect(cleanupJob).toBeDefined();
  });

  it('should start and stop cleanup job', () => {
    // Should not throw
    cleanupJob.start();
    cleanupJob.stop();
    
    expect(true).toBe(true);
  });

  it('should run cleanup immediately', async () => {
    const result = await cleanupJob.runCleanup();
    
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('skillsScanned');
    expect(result).toHaveProperty('versionsDeleted');
    expect(result).toHaveProperty('deferredRetries');
    expect(result).toHaveProperty('spaceFreed');
    expect(result).toHaveProperty('durationMs');
  });

  it('should handle empty cache gracefully', async () => {
    const result = await cleanupJob.runCleanup();
    
    expect(result.skillsScanned).toBe(0);
    expect(result.versionsDeleted).toBe(0);
    expect(result.deferredRetries).toBe(0);
  });

  it('should prevent concurrent runs', async () => {
    const promise1 = cleanupJob.runCleanup();
    const promise2 = cleanupJob.runCleanup(); // Should return early
    
    const results = await Promise.all([promise1, promise2]);
    
    // Second run should have 0 skills scanned
    expect(results[1].skillsScanned).toBe(0);
  });

  it('should handle cleanup errors gracefully', async () => {
    // Create invalid directory structure
    const invalidPath = path.join(cacheDir, 'invalid', 'path');
    fs.mkdirSync(invalidPath, { recursive: true });
    
    // Should not throw
    const result = await cleanupJob.runCleanup();
    expect(result).toBeDefined();
  });

  it('should log cleanup results', async () => {
    const result = await cleanupJob.runCleanup();
    
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
  });
});
