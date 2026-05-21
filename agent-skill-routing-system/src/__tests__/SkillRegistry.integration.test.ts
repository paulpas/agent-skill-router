// Integration tests for SkillRegistry with compression caches
import fs from 'fs';
import path from 'path';
import { SkillRegistry } from '../core/SkillRegistry';

describe('SkillRegistry Integration', () => {
  let skillsDir: string;
  let registry: SkillRegistry;

  beforeEach(() => {
    // Create temp skills directory
    skillsDir = path.join(__dirname, '.skills-test-' + Date.now());
    fs.mkdirSync(skillsDir, { recursive: true });

    // Create a test skill
    const skillPath = path.join(skillsDir, 'test-skill', 'SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(
      skillPath,
      `---
name: test-skill
description: Test skill for integration testing
metadata:
  domain: programming
  version: "1.0.0"
---

# Test Skill

This is a test skill for integration testing.

## When to Use

- Testing purposes only

## Core Workflow

1. Load the skill
2. Use it
3. Verify results
`
    );

    registry = new SkillRegistry({
      skillsDirectory: skillsDir,
      generateEmbeddings: false,
      compressionLevel: 0,
    });
  });

  afterEach(async () => {
    // Clean up
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
  });

  it('should load skills from filesystem', async () => {
    await registry.loadSkills();
    const skills = registry.getAllSkills();
    
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some(s => s.metadata.name === 'test-skill')).toBe(true);
  });

  it('should retrieve skill content', async () => {
    await registry.loadSkills();
    const content = await registry.getSkillContent('test-skill');
    
    expect(content).toBeDefined();
    expect(content.includes('# Test Skill')).toBe(true);
  });

  it('should handle cache layering', async () => {
    await registry.loadSkills();
    
    // First call
    const content1 = await registry.getSkillContent('test-skill');
    
    // Second call (should hit memory cache)
    const content2 = await registry.getSkillContent('test-skill');
    
    expect(content1).toBe(content2);
  });

  it('should handle missing skills gracefully', async () => {
    await registry.loadSkills();
    
    try {
      await registry.getSkillContent('nonexistent-skill');
      expect(true).toBe(false); // Should throw
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should get skills by category', async () => {
    await registry.loadSkills();
    const skillsByCategory = registry.getSkillsByCategory('programming');
    
    expect(skillsByCategory.length).toBeGreaterThan(0);
  });

  it('should get all skills', () => {
    const skills = registry.getAllSkills();
    
    // Should return empty array before loading
    expect(Array.isArray(skills)).toBe(true);
  });

  it('should reload skills', async () => {
    await registry.loadSkills();
    const countBefore = registry.getSkillCount();
    
    await registry.reload();
    const countAfter = registry.getSkillCount();
    
    expect(countBefore).toBe(countAfter);
  });

  it('should get registry stats', () => {
    const stats = registry.getStats();
    
    expect(stats).toHaveProperty('totalSkills');
    expect(stats).toHaveProperty('categories');
    expect(stats).toHaveProperty('tags');
    expect(stats).toHaveProperty('skillsWithoutEmbeddings');
  });

  it('should handle concurrent requests', async () => {
    await registry.loadSkills();
    
    const promises = Array(10)
      .fill(null)
      .map(() => registry.getSkillContent('test-skill'));
    
    const results = await Promise.allSettled(promises);
    
    // All should succeed
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    expect(succeeded).toBe(10);
  });

  it('should search skills by tag', async () => {
    await registry.loadSkills();
    const results = registry.getSkillsByTag('programming');
    
    expect(Array.isArray(results)).toBe(true);
  });

  it('should search by category or tag', async () => {
    await registry.loadSkills();
    const results = registry.searchByCategoryOrTag('programming');
    
    expect(Array.isArray(results)).toBe(true);
  });

  describe('Markdown Link Resolution', () => {
    it('resolves local references when link following is enabled', async () => {
      // Create skill with reference
      const skillPath = path.join(skillsDir, 'test-skill-link-resolve', 'SKILL.md');
      const refDir = path.join(skillsDir, 'test-skill-link-resolve', 'references');
      fs.mkdirSync(refDir, { recursive: true });

      fs.writeFileSync(
        path.join(refDir, 'patterns.md'),
        `# Reference Patterns\n\nPattern 1: Observer\nPattern 2: Strategy`
      );

      fs.writeFileSync(
        skillPath,
        `---
name: test-skill-link-resolve
description: Test skill with references
metadata:
  domain: programming
  version: "1.0.0"
---

# Test Skill

See the [pattern reference](references/patterns.md) for details.
`
      );

      // Create registry with link following enabled
      const linkRegistry = new SkillRegistry({
        skillsDirectory: skillsDir,
        generateEmbeddings: false,
        compressionLevel: 0,
        markdownLinkFollowing: {
          enabled: true,
          allowExternalLinks: false,
          maxDepth: 2,
        },
      });

      await linkRegistry.loadSkills();
      const content = await linkRegistry.getSkillContent('test-skill-link-resolve');

      expect(content).toContain('## 📎 Reference: pattern reference');
      expect(content).toContain('Pattern 1: Observer');
      expect(content).toContain('Pattern 2: Strategy');
    });

    it('does not resolve references when link following is disabled', async () => {
      const skillPath = path.join(skillsDir, 'test-skill-link-disabled', 'SKILL.md');
      const refDir = path.join(skillsDir, 'test-skill-link-disabled', 'references');
      fs.mkdirSync(refDir, { recursive: true });

      fs.writeFileSync(
        path.join(refDir, 'patterns.md'),
        `# Reference Patterns`
      );

      fs.writeFileSync(
        skillPath,
        `---
name: test-skill-link-disabled
description: Test skill with references
metadata:
  domain: programming
  version: "1.0.0"
---

# Test Skill

See the [pattern reference](references/patterns.md) for details.
`
      );

      // Default: link following disabled
      await registry.loadSkills();
      const content = await registry.getSkillContent('test-skill-link-disabled');

      // Link should remain unchanged
      expect(content).toContain('[pattern reference](references/patterns.md)');
      expect(content).not.toContain('## 📎 Reference:');
    });

    it('invalidates cache when link config changes', async () => {
      // Create skill with reference
      const skillPath = path.join(skillsDir, 'test-skill-link-cache', 'SKILL.md');
      const refDir = path.join(skillsDir, 'test-skill-link-cache', 'references');
      fs.mkdirSync(refDir, { recursive: true });

      fs.writeFileSync(
        path.join(refDir, 'patterns.md'),
        `# Reference Patterns\n\nPattern 1: Observer\nPattern 2: Strategy`
      );

      fs.writeFileSync(
        skillPath,
        `---
name: test-skill-link-cache
description: Test skill with references
metadata:
  domain: programming
  version: "1.0.0"
---

# Test Skill

See the [pattern reference](references/patterns.md) for details.
`
      );

      // First get content with links disabled (default)
      await registry.loadSkills();
      const content1 = await registry.getSkillContent('test-skill-link-cache');

      // Verify link is NOT resolved initially
      expect(content1).toContain('[pattern reference](references/patterns.md)');
      expect(content1).not.toContain('## 📎 Reference:');

      // Enable link following
      registry.updateMarkdownLinkConfig({ enabled: true });

      // Get content again - should be different (resolved)
      const content2 = await registry.getSkillContent('test-skill-link-cache');

      // Content should now have resolved references
      expect(content2).toContain('## 📎 Reference: pattern reference');
      expect(content2).toContain('Pattern 1: Observer');
      expect(content2).toContain('Pattern 2: Strategy');

      // Verify content changed
      expect(content2).not.toBe(content1);
    });

    it('blocks path traversal in skill references', async () => {
      const skillDir = path.join(skillsDir, 'test-skill-link-traversal');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, 'SKILL.md');

      fs.writeFileSync(
        skillPath,
        `---
name: test-skill-link-traversal
description: Test skill with malicious reference
metadata:
  domain: programming
  version: "1.0.0"
---

# Test Skill

See the [evil](../../etc/passwd) for details.
`
      );

      const linkRegistry = new SkillRegistry({
        skillsDirectory: skillsDir,
        generateEmbeddings: false,
        compressionLevel: 0,
        markdownLinkFollowing: {
          enabled: true,
          allowExternalLinks: false,
          maxDepth: 2,
        },
      });

      await linkRegistry.loadSkills();
      const content = await linkRegistry.getSkillContent('test-skill-link-traversal');

      // Path traversal link should remain unchanged (blocked)
      expect(content).toContain('[evil](../../etc/passwd)');
      expect(content).not.toContain('## 📎 Reference: evil');
    });
  });
});
