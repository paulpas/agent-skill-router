// Tests for ConcisenessScorer
import { ConcisenessScorer } from '../retrieval/ConcisenessScorer';

describe('ConcisenessScorer', () => {
  // --- Test 1: Procedural skill with numbered steps → high actionable density ---
  describe('procedural skill scoring', () => {
    it('procedural skill with numbered steps → high actionable density', () => {
      const content = `# Debugging Guide

## Core Workflow

1. **Assess the issue** — Review error logs and identify root cause patterns.
   **Checkpoint:** Confirm error type before proceeding.
2. **Isolate the component** — Narrow down to the specific service or module.
3. **Apply fixes** — Implement configuration changes or code patches.
4. **Verify resolution** — Run tests and confirm no regression.

## Constraints

### MUST DO
- Check logs first before making changes
- Document every modification in a rollback plan`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.actionableStepDensity).toBeGreaterThan(0);
      expect(metrics.checklistPresence).toBe(false);
    });

    it('philosophical/prose skill → low command density', () => {
      const content = `# Design Philosophy

This skill explores the principles of elegant system design. We believe that clarity emerges from simplicity, and that thoughtful architecture enables sustainable growth. The approach emphasizes understanding before implementation, and encourages reflective practice in all engineering decisions.`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.commandDensity).toBeLessThan(10);
    });
  });

  // --- Test 2: Checklist presence ---
  describe('checklist detection', () => {
    it('checklist-heavy skill → checklist presence = true, score boost', () => {
      const content = `# Quality Gate

## TL;DR Checklist

- [ ] Verify YAML frontmatter compliance
- [ ] Check description starts with active verb
- [ ] Validate triggers: 5-8 terms, two-tier strategy
- [ ] Confirm file is ≥ 3,000 bytes
- [ ] Ensure Core Workflow has numbered steps

## When to Use

Use this skill when reviewing new skills.`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.checklistPresence).toBe(true);
    });

    it('no checklist items → checklist presence = false', () => {
      const content = `# General Guidance

This is a general guidance skill. Follow best practices when applying it to any project.`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.checklistPresence).toBe(false);
    });
  });

  // --- Test 3: Response profile directive strength ---
  describe('response profile integration', () => {
    it('directive_strength = "high" → correct weight applied', () => {
      const content = 'This is a brief skill.';
      const metrics = ConcisenessScorer.analyze(content, {
        verbosity: 'low',
        directiveStrength: 'high',
      });

      // High directive strength should be reflected in directiveStrength field
      expect(metrics.directiveStrength).toBe('high');
    });

    it('directive_strength = "low" → low directive weight', () => {
      const content = 'This is a brief skill.';
      const metrics = ConcisenessScorer.analyze(content, {
        verbosity: 'medium',
        directiveStrength: 'low',
      });

      expect(metrics.directiveStrength).toBe('low');
    });
  });

  // --- Test 4: Empty content ---
  describe('empty content', () => {
    it('empty content → all metrics 0, score 0', () => {
      const metrics = ConcisenessScorer.analyze('');

      expect(metrics.actionableStepDensity).toBe(0);
      expect(metrics.commandDensity).toBe(0);
      expect(metrics.checklistPresence).toBe(false);
      expect(metrics.directiveStrength).toBe('low');

      const score = ConcisenessScorer.computeScore(metrics);
      expect(score).toBe(0);
    });
  });

  // --- Test 5: Imperative verb density ---
  describe('command density', () => {
    it('skill with many imperative verbs ("Implement", "Configure", "Deploy") → high command density', () => {
      const content = `# Implementation Guide

1. Implement the authentication module first
2. Configure the database connections
3. Deploy the application to staging
4. Set up monitoring and alerting
5. Create the backup procedures
6. Install dependencies
7. Fix all lint errors
8. Resolve merge conflicts
9. Enable TLS encryption
10. Disable debug mode
11. Add unit tests
12. Remove deprecated APIs`;

      const metrics = ConcisenessScorer.analyze(content);

      // 12 imperative verbs in ~50 tokens → high density
      expect(metrics.commandDensity).toBeGreaterThan(100);
    });
  });

  // --- Test 6: Score normalization ---
  describe('score normalization', () => {
    it('final score always in [0, 1] range', () => {
      const testCases = [
        ConcisenessScorer.analyze(''),
        ConcisenessScorer.analyze('very short'),
        ConcisenessScorer.analyze(`# Full Skill

1. Do this thing
2. Do another thing
3. Do a third thing

- [x] Check one
- [ ] Check another
- [ ] And another

Implement the feature properly. Configure all settings. Deploy to production.`),
      ];

      for (const metrics of testCases) {
        const score = ConcisenessScorer.computeScore(metrics);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // --- Test 7: Directive strength inference from content ---
  describe('directive strength inference', () => {
    it('high imperative verb ratio → inferred "high" directive strength', () => {
      const content = `# Operations Guide

Fix all issues immediately. Deploy changes to production. Monitor metrics closely. Set up alerts for all critical services. Configure security policies properly.`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.directiveStrength).toBe('high');
    });

    it('low imperative ratio → inferred "medium" directive strength', () => {
      const content = `# Background Context

This topic covers various approaches to system design. Different teams may choose different methods based on their specific needs and constraints.`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.directiveStrength).not.toBe('high');
    });
  });

  // --- Test 8: Actionable step density calculation ---
  describe('actionable step density', () => {
    it('counts numbered steps correctly per 1000 tokens', () => {
      const content = `# Step-by-Step Guide

1. Install the package using npm
2. Configure the settings file
3. Run the initialization script
4. Verify the installation works`;

      const metrics = ConcisenessScorer.analyze(content);

      // 4 numbered steps, small document → density should be positive
      expect(metrics.actionableStepDensity).toBeGreaterThan(0);
    });

    it('counts bullet points starting with action verbs', () => {
      const content = `- Create the project directory
- Initialize the repository
- Add the configuration files
- Commit all changes`;

      const metrics = ConcisenessScorer.analyze(content);

      expect(metrics.actionableStepDensity).toBeGreaterThan(0);
    });
  });

  // --- Test 9: Combined scoring ---
  describe('combined score', () => {
    it('procedural checklist skill → highest possible score', () => {
      const content = `# Quick Start Checklist

- [ ] Read the documentation first
- [ ] Install required dependencies

## Steps

1. **Set up** — Initialize the project with npm init.
2. **Configure** — Update config.json with your settings.
3. **Deploy** — Push to the production environment.`;

      const metrics = ConcisenessScorer.analyze(content);
      const score = ConcisenessScorer.computeScore(metrics);

      expect(score).toBeGreaterThan(0.5);
    });

    it('prose-only philosophical skill → lowest reasonable score', () => {
      const content = `# Philosophy of Simplicity

In our view, simplicity emerges when we carefully consider the trade-offs between complexity and clarity. The best solutions are often those that require the least cognitive overhead.`;

      const metrics = ConcisenessScorer.analyze(content);
      const score = ConcisenessScorer.computeScore(metrics);

      expect(score).toBeLessThan(0.3);
    });
  });
});
