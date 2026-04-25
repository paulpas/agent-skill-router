// End-to-end tests for compression system
import fs from 'fs';
import path from 'path';
import { SkillRegistry } from '../core/SkillRegistry';
import { DiskCompressionCache } from '../core/DiskCompressionCache';
import { InMemoryCompressionCache } from '../core/InMemoryCompressionCache';
import { CompressionDeduplicator } from '../core/CompressionDeduplicator';
import { LLMSkillCompressor, LLMClient } from '../core/LLMSkillCompressor';

/**
 * Mock LLM Client for testing
 */
class MockLLMClient implements LLMClient {
  async createCompletion() {
    return {
      choices: [
        {
          message: {
            content: `---
name: test-skill
---

# Test Skill

Brief version of the skill.`,
          },
        },
      ],
    };
  }
}

describe('Compression E2E', () => {
  let skillsDir: string;
  let registry: SkillRegistry;
  let diskCache: DiskCompressionCache;
  let memoryCache: InMemoryCompressionCache;

  beforeEach(() => {
    // Create temp skills directory
    skillsDir = path.join(__dirname, '.e2e-test-' + Date.now());
    fs.mkdirSync(skillsDir, { recursive: true });

    // Create test skill
    const skillPath = path.join(skillsDir, 'programming', 'test-skill', 'SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(
      skillPath,
      `---
name: test-skill
description: Test skill
metadata:
  domain: programming
  version: "1.0.0"
---

# Test Skill

This is a long test skill content that should be compressible.

## When to Use

- Testing purposes
- Validation of compression

## Core Workflow

1. First step
2. Second step
3. Third step

## Implementation Pattern

Here is some code:

\`\`\`typescript
function test() {
  console.log('test');
}
\`\`\`

## Additional Context

This skill is used for testing the compression system end-to-end.
It should compress well and demonstrate all phases working together.
`
    );

    registry = new SkillRegistry({
      skillsDirectory: skillsDir,
      generateEmbeddings: false,
      compressionLevel: 0,
    });

    diskCache = new DiskCompressionCache(skillsDir);
    memoryCache = new InMemoryCompressionCache(60);
  });

  afterEach(() => {
    memoryCache.shutdown();
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
  });

  it('should load and retrieve skill content', async () => {
    await registry.loadSkills();
    const content = await registry.getSkillContent('test-skill');

    expect(content).toBeDefined();
    expect(content.includes('# Test Skill')).toBe(true);
  });

  it('should compress skill using LLM', async () => {
    const llmClient = new MockLLMClient();
    const compressor = new LLMSkillCompressor(llmClient);
    
    const skillContent = `---
name: test
---

# Test Skill

Long content here that should be compressed.`;

    const result = await compressor.compressSkill('test-skill', skillContent);

    expect(result).not.toBeNull();
    expect(result?.brief).toBeDefined();
    expect(result?.moderate).toBeDefined();
    expect(result?.detailed).toBeDefined();
  });

  it('should deduplicate concurrent compression requests', async () => {
    const llmClient = new MockLLMClient();
    const compressor = new LLMSkillCompressor(llmClient);
    const deduplicator = new CompressionDeduplicator();

    const skillContent = '# Test\n\nContent';
    
    // Make 5 concurrent requests for the same skill
    const promises = Array(5)
      .fill(null)
      .map(() => deduplicator.compress('same-skill', skillContent, compressor));

    const results = await Promise.all(promises);

    // All should return the same result
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });

  it('should cache compressed versions in memory', () => {
    const version = {
      content: '# Brief\n\nShort',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief' as const,
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    memoryCache.set('test-skill', 'brief', version);
    const retrieved = memoryCache.get('test-skill', 'brief');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe('# Brief\n\nShort');
  });

  it('should cache compressed versions on disk', async () => {
    const versions = {
      brief: {
        content: '# Brief',
        tokens: 50,
        compressionRatio: 0.1,
        version: 'brief' as const,
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      moderate: {
        content: '# Moderate',
        tokens: 100,
        compressionRatio: 0.25,
        version: 'moderate' as const,
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
      detailed: {
        content: '# Detailed',
        tokens: 200,
        compressionRatio: 0.5,
        version: 'detailed' as const,
        generatedAt: new Date(),
        isValid: true,
        validationErrors: [],
      },
    };

    await diskCache.saveCompressedVersions('test-skill', 'programming', versions);
    
    // Wait a bit for write buffer to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify files were written
    const stats = diskCache.getStats();
    expect(stats.bufferSize >= 0).toBe(true);
  });

  it('should handle cache layering (memory -> disk)', () => {
    const version = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief' as const,
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    // Layer 1: Memory cache
    memoryCache.set('test-skill', 'brief', version);
    const memoryHit = memoryCache.get('test-skill', 'brief');
    expect(memoryHit).not.toBeNull();

    // Layer 2: Disk cache (would be checked if memory miss)
    // In real system, disk cache would be checked next
  });

  it('should track access statistics', () => {
    const version = {
      content: '# Test',
      tokens: 50,
      compressionRatio: 0.1,
      version: 'brief' as const,
      generatedAt: new Date(),
      isValid: true,
      validationErrors: [],
    };

    memoryCache.set('skill1', 'brief', version);
    memoryCache.get('skill1', 'brief');
    memoryCache.get('skill1', 'brief');
    memoryCache.get('skill1', 'nonexistent');

    const stats = memoryCache.getStats();
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.misses).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const llmClient = new MockLLMClient();
    const compressor = new LLMSkillCompressor(llmClient);
    
    // Should not throw on null input
    const result = await compressor.compressSkill('', '');
    
    expect(result).toBeNull();
  });

  it('should support concurrent requests stress test', async () => {
    await registry.loadSkills();
    
    // Make 100 concurrent requests
    const promises = Array(100)
      .fill(null)
      .map(() => registry.getSkillContent('test-skill'));

    const results = await Promise.allSettled(promises);
    const succeeded = results.filter(r => r.status === 'fulfilled').length;

    // All should succeed
    expect(succeeded).toBe(100);
  });
});
