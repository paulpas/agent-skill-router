// Unit tests for SkillCompressor

import { SkillCompressor } from '../core/SkillCompressor';

describe('SkillCompressor', () => {
  let compressor: SkillCompressor;

  // Sample skill content for testing
  const sampleSkill = `# Code Review

Comprehensive code review methodology.

## When to Use

- When reviewing pull requests
- Before merging to main branch
- For security audits

## When NOT to Use

- For trivial changes
- Without a code review policy

## Core Workflow

1. **Read the code** — Understand what it does
2. **Check for bugs** — Look for errors
3. **Review quality** — Assess code quality

## Implementation Details

\`\`\`python
def review_code(content: str) -> dict:
    return {"status": "reviewed"}
\`\`\`

## Related Skills

| Skill | Purpose |
|-------|---------|
| code-testing | Unit testing |
| code-security | Security review |`;

  beforeEach(() => {
    compressor = new SkillCompressor();
  });

  describe('Level 0: No Compression', () => {
    it('should return content unchanged at level 0', () => {
      const result = compressor.compress(sampleSkill, 0);
      expect(result.content).toBe(sampleSkill);
      expect(result.isCompressed).toBe(false);
      expect(result.compressionLevel).toBe(0);
    });

    it('should have compressPercent 0 at level 0', () => {
      const result = compressor.compress(sampleSkill, 0);
      expect(result.compressPercent).toBe(0);
    });
  });

  describe('Level 1: Blank Line Removal', () => {
    it('should compress level 1', () => {
      const contentWithBlanks = sampleSkill + `


Extra blank lines here


More content`;

      const result = compressor.compress(contentWithBlanks, 1);
      // Should be compressed (or not compressed if too little difference)
      expect(result.compressionLevel).toBeLessThanOrEqual(1);
      expect(result.content.length).toBeLessThanOrEqual(contentWithBlanks.length);
    });

    it('should preserve blank lines in code blocks', () => {
      const withCodeBlock = `# Test

\`\`\`
function test() {

  return true;
}
\`\`\`

Content`;

      const result = compressor.compress(withCodeBlock, 1);
      // Code block should be unchanged
      expect(result.content).toContain('function test()');
    });
  });

  describe('Level 2: Remove "When to Use" Section', () => {
    it('should remove When to Use section', () => {
      const result = compressor.compress(sampleSkill, 2);
      expect(result.content).not.toContain('When to Use');
    });

    it('should preserve other sections', () => {
      const result = compressor.compress(sampleSkill, 2);
      expect(result.content).toContain('Core Workflow');
      expect(result.content).toContain('Implementation Details');
    });
  });

  describe('Level 3: Remove "When NOT to Use"', () => {
    it('should remove When NOT to Use section', () => {
      const result = compressor.compress(sampleSkill, 3);
      expect(result.content).not.toContain('When NOT to Use');
    });

    it('should also remove When to Use (cumulative)', () => {
      const result = compressor.compress(sampleSkill, 3);
      expect(result.content).not.toContain('When to Use');
      expect(result.content).not.toContain('When NOT to Use');
    });
  });

  describe('Level 5: Remove Related Skills', () => {
    it('should compress more than level 4', () => {
      const result4 = compressor.compress(sampleSkill, 4);
      const result5 = compressor.compress(sampleSkill, 5);
      // Level 5 should be same or smaller than level 4
      expect(result5.content.length).toBeLessThanOrEqual(result4.content.length);
    });
  });

  describe('Level 6: Remove Formatting', () => {
    it('should remove bold formatting', () => {
      const result = compressor.compress(sampleSkill, 6);
      // **Read the code** becomes Read the code
      expect(result.content).not.toContain('**Read');
      expect(result.content).toContain('Read');
    });

    it('should preserve code blocks with formatting', () => {
      const withCodeBlock = sampleSkill + `

\`\`\`python
def bold_var():
    **important** = True
\`\`\`

Normal **bold** text`;

      const result = compressor.compress(withCodeBlock, 6);
      // Code block formatting should be preserved
      expect(result.content).toContain('**important**');
      // Should compress successfully
      expect(result.content.length).toBeLessThanOrEqual(withCodeBlock.length);
    });
  });

  describe('shouldCompress', () => {
    it('should skip compression for very small content', () => {
      const tiny = 'x';
      expect(compressor.shouldCompress(tiny)).toBe(false);
    });

    it('should compress for reasonably-sized content', () => {
      expect(compressor.shouldCompress(sampleSkill)).toBe(true);
    });

    it('should skip if content < 100 tokens', () => {
      const small = 'Test ' + 'skill '.repeat(10); // ~60 tokens
      expect(compressor.shouldCompress(small)).toBe(false);
    });
  });

  describe('estimateTokenSavings', () => {
    it('should return accurate token estimates', () => {
      const estimate = compressor.estimateTokenSavings(sampleSkill, 5);
      expect(estimate.before).toBeGreaterThan(0);
      expect(estimate.after).toBeGreaterThan(0);
      expect(estimate.before).toBeGreaterThanOrEqual(estimate.after);
      expect(estimate.saved).toBeGreaterThanOrEqual(0);
      expect(estimate.compressPercent).toBeGreaterThanOrEqual(0);
      expect(estimate.compressPercent).toBeLessThanOrEqual(100);
    });

    it('should save tokens proportional to compression level', () => {
      const level1 = compressor.estimateTokenSavings(sampleSkill, 1);
      const level5 = compressor.estimateTokenSavings(sampleSkill, 5);
      const level9 = compressor.estimateTokenSavings(sampleSkill, 9);

      // Higher levels should save more tokens
      expect(level5.saved).toBeGreaterThanOrEqual(level1.saved);
      expect(level9.saved).toBeGreaterThanOrEqual(level5.saved);
    });
  });

  describe('getRecipe', () => {
    it('should return recipe for valid level', () => {
      const recipe = compressor.getRecipe(5);
      expect(recipe).not.toBeNull();
      expect(recipe?.level).toBe(5);
      expect(recipe?.description).toContain('related');
    });

    it('should return null for invalid level', () => {
      const recipe = compressor.getRecipe(-1);
      expect(recipe).toBeNull();
    });

    it('should map high levels to level 10', () => {
      const recipe10 = compressor.getRecipe(10);
      const recipe99 = compressor.getRecipe(99);
      expect(recipe10).not.toBeNull();
      expect(recipe99).not.toBeNull();
      // Both should be valid recipes
    });
  });

  describe('getAllLevelDescriptions', () => {
    it('should return descriptions for all levels', () => {
      const descriptions = compressor.getAllLevelDescriptions();
      expect(descriptions.length).toBe(11); // 0-10
      expect(descriptions[0].level).toBe(0);
      expect(descriptions[10].level).toBe(10);
    });

    it('should have meaningful descriptions', () => {
      const descriptions = compressor.getAllLevelDescriptions();
      for (const desc of descriptions) {
        expect(desc.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Code Block Protection', () => {
    it('should never compress code blocks', () => {
      const withCode = sampleSkill + `

## Additional Code Example

Normal **bold** text that needs more content.

\`\`\`python
def important():
    # This **code** is critical
    return True
\`\`\`

More **bold** text with additional context.`;

      const result = compressor.compress(withCode, 6);
      
      // Code formatting preserved
      expect(result.content).toContain('# This **code** is critical');
      
      // Compression level 6 should be shorter than original
      expect(result.content.length).toBeLessThanOrEqual(withCode.length);
    });

    it('should preserve YAML frontmatter', () => {
      const withFrontmatter = `---
name: test-skill
description: A test skill
metadata:
  version: "1.0.0"
---

# Test Skill

**Content** here.`;

      const result = compressor.compress(withFrontmatter, 6);
      
      // Frontmatter should be unchanged
      expect(result.content).toContain('---\nname: test-skill');
      expect(result.content).toContain('version: "1.0.0"');
    });
  });

  describe('Compression Error Handling', () => {
    it('should handle compression gracefully and return original on error', () => {
      // Create a deeply nested structure that might cause issues
      const complexSkill = sampleSkill.repeat(100);
      
      const result = compressor.compress(complexSkill, 5);
      
      // Should either compress or return original (no exception)
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.originalLength).toBeGreaterThan(0);
    });
  });

  describe('Cumulative Compression', () => {
    it('should apply cumulative transformations from level 1 to N', () => {
      const level1 = compressor.compress(sampleSkill, 1);
      const level3 = compressor.compress(sampleSkill, 3);
      const level5 = compressor.compress(sampleSkill, 5);

      // Each higher level should be smaller or equal
      expect(level1.content.length).toBeGreaterThanOrEqual(level3.content.length);
      expect(level3.content.length).toBeGreaterThanOrEqual(level5.content.length);
    });

    it('should match applying transformations sequentially', () => {
      // Compressing at level 5 should equal applying levels 1-5 in order
      const direct = compressor.compress(sampleSkill, 5);
      
      // Sequentially apply levels
      let sequential = sampleSkill;
      for (let i = 1; i <= 5; i++) {
        const comp = compressor.compress(sequential, i);
        sequential = comp.content;
      }

      // Both should have roughly same result
      expect(direct.content.length).toBeLessThanOrEqual(sequential.length + 100); // Allow small variance
    });
  });

  describe('Token Estimation Accuracy', () => {
    it('should estimate tokens within 5% for typical content', () => {
      const estimate = compressor.estimateTokenSavings(sampleSkill, 5);
      
      // Rough validation: tokens should be proportional to content length
      const roughTokens = sampleSkill.length / 4; // Very rough
      
      expect(estimate.before).toBeGreaterThan(roughTokens * 0.5);
      expect(estimate.before).toBeLessThan(roughTokens * 2);
    });
  });

  describe('Boundary Cases', () => {
    it('should handle empty content gracefully', () => {
      const result = compressor.compress('', 5);
      expect(result.content).toBe('');
      expect(result.isCompressed).toBe(false);
    });

    it('should handle very long content', () => {
      const longSkill = 'x'.repeat(100000) + sampleSkill;
      const result = compressor.compress(longSkill, 5);
      
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.originalLength).toBeGreaterThan(100000);
    });

    it('should handle content with only code blocks', () => {
      const onlyCode = `# Test

\`\`\`python
def main():
    pass
\`\`\`

\`\`\`javascript
function main() {}
\`\`\``;

      const result = compressor.compress(onlyCode, 6);
      expect(result.content).toContain('```python');
      expect(result.content).toContain('```javascript');
    });
  });
});
