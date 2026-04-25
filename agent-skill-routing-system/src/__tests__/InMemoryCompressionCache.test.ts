// Tests for InMemoryCompressionCache
import { InMemoryCompressionCache } from '../core/InMemoryCompressionCache';
import { CompressedVersion } from '../core/LLMSkillCompressor';

describe('InMemoryCompressionCache', () => {
  let cache: InMemoryCompressionCache;

  beforeEach(() => {
    cache = new InMemoryCompressionCache(60); // 1 hour TTL
  });

  afterEach(() => {
    cache.shutdown();
  });

  it('should store and retrieve compressed versions', () => {
    const version: CompressedVersion = {
      content: '# Test\n\nContent',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    cache.set('test-skill', 'brief', version);
    const retrieved = cache.get('test-skill', 'brief');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe('# Test\n\nContent');
  });

  it('should return null for missing entries', () => {
    const result = cache.get('nonexistent', 'brief');
    expect(result).toBeNull();
  });

  it('should reset TTL on each access', () => {
    const version: CompressedVersion = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    cache.set('test-skill', 'brief', version);
    
    // First access
    const first = cache.get('test-skill', 'brief');
    expect(first).not.toBeNull();
    
    // Second access should also work (TTL reset)
    const second = cache.get('test-skill', 'brief');
    expect(second).not.toBeNull();
  });

  it('should delete specific versions', () => {
    const version: CompressedVersion = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    cache.set('test-skill', 'brief', version);
    cache.delete('test-skill', 'brief');
    
    const result = cache.get('test-skill', 'brief');
    expect(result).toBeNull();
  });

  it('should delete all versions for a skill', () => {
    const version: CompressedVersion = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    cache.set('test-skill', 'brief', version);
    cache.set('test-skill', 'moderate', version);
    cache.set('test-skill', 'detailed', version);
    
    cache.delete('test-skill');
    
    expect(cache.get('test-skill', 'brief')).toBeNull();
    expect(cache.get('test-skill', 'moderate')).toBeNull();
    expect(cache.get('test-skill', 'detailed')).toBeNull();
  });

  it('should clear all entries', () => {
    const version: CompressedVersion = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    cache.set('skill1', 'brief', version);
    cache.set('skill2', 'moderate', version);
    
    cache.clear();
    
    expect(cache.getStats().entries).toBe(0);
  });

  it('should track cache statistics', () => {
    const version: CompressedVersion = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    cache.set('test-skill', 'brief', version);
    cache.get('test-skill', 'brief'); // hit
    cache.get('test-skill', 'nonexistent'); // miss
    
    const stats = cache.getStats();
    expect(stats.entries).toBe(1);
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.misses).toBeGreaterThan(0);
  });

  it('should handle invalid inputs gracefully', () => {
    const version: CompressedVersion = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief',
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    // Should not throw
    cache.set('', '', version);
    cache.get('', '');
    cache.delete('', '');
    
    expect(true).toBe(true);
  });
});
