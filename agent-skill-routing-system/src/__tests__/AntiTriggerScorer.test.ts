// Tests for AntiTriggerScorer
import { AntiTriggerScorer } from '../core/AntiTriggerScorer';

describe('AntiTriggerScorer', () => {
  // --- No anti-triggers ---
  describe('no anti-triggers on skill', () => {
    it('empty anti_triggers list → no penalty', () => {
      const penalty = AntiTriggerScorer.computePenalty('fix this bug', []);
      expect(penalty).toBe(0);
    });

    it('undefined anti_triggers → no penalty', () => {
      const penalty = AntiTriggerScorer.computePenalty('fix this bug', undefined as unknown as string[]);
      expect(penalty).toBe(0);
    });

    it('factor 1.0 when no anti-triggers (verify apply)', () => {
      const result = AntiTriggerScorer.apply(0.8, 'fix this bug', []);
      expect(result).toBeCloseTo(0.8, 2);
    });
  });

  // --- Single anti-trigger match ---
  describe('single anti-trigger match', () => {
    it("anti-trigger 'brainstorming' in query 'I need help with brainstorming today' → penalty -0.15", () => {
      const penalty = AntiTriggerScorer.computePenalty('I need help with brainstorming today', ['brainstorming']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });

    it("anti-trigger 'vague ideation' matches query with same phrase", () => {
      const penalty = AntiTriggerScorer.computePenalty('I want some vague ideation here', ['vague ideation']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });

    it("anti-trigger 'long-form content generation' matches query", () => {
      const penalty = AntiTriggerScorer.computePenalty('stop long-form content generation please', ['long-form content generation']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });
  });

  // --- Multiple matches ---
  describe('multiple anti-trigger matches', () => {
    it("brainstorming + vague ideation + long-form all in query → penalty capped at -0.45", () => {
      const penalty = AntiTriggerScorer.computePenalty(
        'I need help with brainstorming and vague ideation and long-form content generation',
        ['brainstorming', 'vague ideation', 'long-form content generation']
      );
      expect(penalty).toBeCloseTo(-0.45, 2);
    });

    it("10 anti-triggers all matching → capped at -0.5", () => {
      const triggers = Array.from({ length: 10 }, (_, i) => `trigger-${i + 1}`);
      const query = 'trigger-1 trigger-2 trigger-3 trigger-4 trigger-5 trigger-6 trigger-7 trigger-8 trigger-9 trigger-10';
      const penalty = AntiTriggerScorer.computePenalty(query, triggers);
      expect(penalty).toBeCloseTo(-0.5, 2); // max penalty
    });

    it("4 matches → -0.60 but capped at -0.5", () => {
      const penalty = AntiTriggerScorer.computePenalty(
        'I need brainstorming and debugging and coding and testing help',
        ['brainstorming', 'debugging', 'coding', 'testing']
      );
      // 4 * 0.15 = 0.60, capped at 0.50
      expect(penalty).toBeCloseTo(-0.5, 2);
    });
  });

  // --- No match ---
  describe('no anti-trigger match', () => {
    it("anti-triggers ['security audit'] in query 'fix bug' → no penalty", () => {
      const penalty = AntiTriggerScorer.computePenalty('fix bug', ['security audit']);
      expect(penalty).toBe(0);
    });

    it("completely unrelated query and anti-triggers → no penalty", () => {
      const penalty = AntiTriggerScorer.computePenalty('deploy my application to production', ['brainstorming', 'vague ideation']);
      expect(penalty).toBe(0);
    });
  });

  // --- Case insensitivity ---
  describe('case insensitive matching', () => {
  it("anti-trigger 'Brainstorming' matches query with exact word", () => {
      const penalty = AntiTriggerScorer.computePenalty('I need brainstorming today', ['Brainstorming']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });

    it("anti-trigger 'SECURITY AUDIT' matches query with lowercase", () => {
      const penalty = AntiTriggerScorer.computePenalty('need a security audit done', ['SECURITY AUDIT']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });

 it("mixed case in both query and triggers → still matches", () => {
      const penalty = AntiTriggerScorer.computePenalty('Help me BrainStOrMiNg some Ideas', ['brainstorming']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });
  });

  // --- Word boundary matching ---
  describe('word boundary check', () => {
    it("anti-trigger 'debug' should NOT match query 'debut ceremony'", () => {
      const penalty = AntiTriggerScorer.computePenalty('debut ceremony tomorrow', ['debug']);
      expect(penalty).toBe(0);
    });

    it("anti-trigger 'debug' DOES match query 'help me debug this'", () => {
      const penalty = AntiTriggerScorer.computePenalty('help me debug this issue', ['debug']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });

    it("anti-trigger 'code' should NOT match query 'coding is fun'", () => {
      const penalty = AntiTriggerScorer.computePenalty('coding is fun and educational', ['code']);
      expect(penalty).toBe(0);
    });

    it("anti-trigger 'test' does not match 'testing'", () => {
      const penalty = AntiTriggerScorer.computePenalty('I am testing the application', ['test']);
      // "test" appears in "testing" but with word boundary check, \btest\b should NOT match "testing"
      expect(penalty).toBe(0);
    });

    it("anti-trigger 'fix' matches 'fix the issue'", () => {
      const penalty = AntiTriggerScorer.computePenalty('can you fix the issue for me', ['fix']);
      expect(penalty).toBeCloseTo(-0.15, 2);
    });
  });

  // --- Apply function ---
  describe('apply function', () => {
    it('score 0.8 with -0.3 penalty → result 0.5', () => {
      const result = AntiTriggerScorer.apply(
        0.8,
        'I need help with brainstorming and debugging this code',
        ['brainstorming', 'debugging']
      );
      expect(result).toBeCloseTo(0.5, 2); // 0.8 + (-0.3) = 0.5
    });

it('score 0.6 with -0.15 penalty → result ~0.45', () => {
      const result = AntiTriggerScorer.apply(
        0.6,
        'I need help with brainstorming today',
        ['brainstorming']
      );
      expect(result).toBeCloseTo(0.45, 1); // 0.6 + (-0.15) ≈ 0.45 (floating point)
    });

    it('score 0.3 with -0.15 penalty → result ~0.15', () => {
      const result = AntiTriggerScorer.apply(0.3, 'I need brainstorming help', ['brainstorming']);
      expect(result).toBeCloseTo(0.15, 1); // 0.3 + (-0.15) ≈ 0.15 (floating point)
    });

  it('score 0.3 with -0.15 penalty → result ~0.15', () => {
      const result = AntiTriggerScorer.apply(0.3, 'brainstorming session', ['brainstorming']);
      expect(result).toBeCloseTo(0.15, 1); // 0.3 + (-0.15) ≈ 0.15 (floating point)
    });

    it('score 0.2 with -0.3 penalty → result 0 (clamped to floor)', () => {
      const result = AntiTriggerScorer.apply(
        0.2,
        'I need brainstorming and debugging help',
        ['brainstorming', 'debugging']
      );
      expect(result).toBeCloseTo(0, 2); // 0.2 + (-0.3) = -0.1 → clamped to 0
    });

    it('score 0 with any penalty → stays 0', () => {
      const result = AntiTriggerScorer.apply(0, 'brainstorming session', ['brainstorming']);
      expect(result).toBeCloseTo(0, 2); // max(0, 0 + (-0.15)) = 0
    });

    it('score 1 with penalty → reduced but stays in [0,1]', () => {
      const result = AntiTriggerScorer.apply(
        1.0,
        'I need brainstorming and debugging today',
        ['brainstorming', 'debugging']
      );
      // 2 matches * 0.15 = 0.30 penalty
      // 1.0 + (-0.3) = 0.7
      expect(result).toBeCloseTo(0.7, 2);
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('empty query with anti-triggers → no penalty (nothing to match against)', () => {
      const penalty = AntiTriggerScorer.computePenalty('', ['brainstorming']);
      expect(penalty).toBe(0);
    });

    it('anti-triggers with whitespace are trimmed', () => {
      const penalty = AntiTriggerScorer.computePenalty(
        'I need brainstorming help',
        ['  brainstorming  ', 'vague ideation']
      );
      expect(penalty).toBeCloseTo(-0.15, 2);
    });

  it('duplicate anti-triggers are counted only once', () => {
      const penalty = AntiTriggerScorer.computePenalty(
        'I need brainstorming help',
        ['brainstorming', 'brainstorming', 'brainstorming']
      );
      expect(penalty).toBeCloseTo(-0.15, 2); // Only one unique match counted
    });

    it('anti-triggers with whitespace are trimmed', () => {
      const penalty = AntiTriggerScorer.computePenalty(
        'I need brainstorming help',
        ['  brainstorming  ', 'vague ideation']
      );
      expect(penalty).toBeCloseTo(-0.15, 2);
    });
  });
});
