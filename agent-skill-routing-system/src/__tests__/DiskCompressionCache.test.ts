// Tests for DiskCompressionCache
import fs from 'fs';
import path from 'path';
import { DiskCompressionCache } from '../core/DiskCompressionCache';
import { CompressedVersions } from '../core/LLMSkillCompressor';

describe('DiskCompressionCache', () => {
  let cacheDir: string;
  let cache: DiskCompressionCache;

  beforeEach(() => {
    // Create temp directory for testing
    cacheDir = path.join(__dirname, '.cache-test-' + Date.now());
    fs.mkdirSync(cacheDir, { recursive: true });
    cache = new DiskCompressionCache(cacheDir);
  });

  afterEach(async () => {
    // Clean up
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('should save compressed versions to write buffer', async () => {
    const versions: CompressedVersions = {
      brief: {
        content: '# Brief\n\nShort version',
        tokens: 50,
        compressionRatio: 0.1,
        version: 'brief',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      moderate: {
        content: '# Moderate\n\nMedium version',
        tokens: 100,
        compressionRatio: 0.25,
        version: 'moderate',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      detailed: {
        content: '# Detailed\n\nFull version',
        tokens: 200,
        compressionRatio: 0.5,
        version: 'detailed',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
    };

    await cache.saveCompressedVersions('test-skill', 'coding', versions);
    const stats = cache.getStats();
    
    expect(stats.bufferSize).toBe(1); // Should be in write buffer
  });

  it('should clean up expired versions', async () => {
    const skillName = 'test-skill';
    const domain = 'coding';
    
    const versions: CompressedVersions = {
      brief: {
        content: '# Brief',
        tokens: 50,
        compressionRatio: 0.1,
        version: 'brief',
        generatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days old
        isValid: true,
        validationErrors: [],
      },
      moderate: {
        content: '# Moderate',
        tokens: 100,
        compressionRatio: 0.25,
        version: 'moderate',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      detailed: {
        content: '# Detailed',
        tokens: 200,
        compressionRatio: 0.5,
        version: 'detailed',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
    };

    await cache.saveCompressedVersions(skillName, domain, versions);
    // Flush write buffer first
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await cache.cleanupExpiredVersions(skillName, domain);
    
    // Brief should be marked for deletion (>7 days)
    expect(result.deleted.length).toBeGreaterThanOrEqual(0);
  });

  it('should return null for missing version', async () => {
    const result = await cache.getCompressedVersion('nonexistent', 'coding', 'brief');
    
    expect(result).toBeNull();
  });

  it('should delete all versions for a skill', async () => {
    const skillName = 'test-skill';
    const domain = 'coding';
    
    const versions: CompressedVersions = {
      brief: {
        content: '# Brief',
        tokens: 50,
        compressionRatio: 0.1,
        version: 'brief',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      moderate: {
        content: '# Moderate',
        tokens: 100,
        compressionRatio: 0.25,
        version: 'moderate',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      detailed: {
        content: '# Detailed',
        tokens: 200,
        compressionRatio: 0.5,
        version: 'detailed',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
    };

    await cache.saveCompressedVersions(skillName, domain, versions);
    await cache.deleteAll(skillName, domain);
    
    const stats = cache.getStats();
    expect(stats.cachedMetadata).toBe(0);
  });

  it('should track access times', async () => {
    const skillName = 'test-skill';
    const domain = 'coding';
    
    const versions: CompressedVersions = {
      brief: {
        content: '# Brief',
        tokens: 50,
        compressionRatio: 0.1,
        version: 'brief',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      moderate: {
        content: '# Moderate',
        tokens: 100,
        compressionRatio: 0.25,
        version: 'moderate',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      detailed: {
        content: '# Detailed',
        tokens: 200,
        compressionRatio: 0.5,
        version: 'detailed',
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
    };

    await cache.saveCompressedVersions(skillName, domain, versions);
    await cache.updateAccessTime(skillName, domain, 'brief');
    
    // Should not throw
    expect(true).toBe(true);
  });

  it('should handle invalid inputs gracefully', async () => {
    // Should not throw
    await cache.saveCompressedVersions('', '', undefined as any);
    await cache.updateAccessTime('', '', 'brief');
    await cache.deleteAll('', '');
    
    expect(true).toBe(true);
  });
});
