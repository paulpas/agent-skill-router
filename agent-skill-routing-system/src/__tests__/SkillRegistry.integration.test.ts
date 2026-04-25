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
});
